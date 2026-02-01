const express = require('express');
const { PlaidApi, PlaidEnvironments, Configuration } = require('plaid');
const Account = require('../models/Account');
const auth = require('../middleware/auth');

const router = express.Router();

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

// Create Link token for Plaid Link
router.post('/create-link-token', auth, async (req, res) => {
  try {
    if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
      return res.status(503).json({
        message: 'Plaid is not configured. Add PLAID_CLIENT_ID and PLAID_SECRET to backend .env',
      });
    }

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: req.userId.toString() },
      client_name: 'FinanceHub',
      language: 'en',
      country_codes: ['US'],
      products: ['auth', 'transactions'],
    });

    res.json({ linkToken: response.data.link_token });
  } catch (error) {
    console.error('Create link token error:', error.response?.data || error);
    res.status(500).json({
      message: error.response?.data?.error_message || 'Failed to create link token',
    });
  }
});

// Exchange public token and sync accounts
router.post('/exchange-token', auth, async (req, res) => {
  try {
    const { publicToken } = req.body;
    if (!publicToken) {
      return res.status(400).json({ message: 'publicToken is required' });
    }

    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Get accounts from Plaid
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const accounts = accountsResponse.data.accounts || [];

    const created = [];
    for (const acc of accounts) {
      const existing = await Account.findOne({
        user: req.userId,
        plaidAccountId: acc.account_id,
      });
      if (existing) continue;

      const type = (acc.type === 'depository' && acc.subtype === 'checking')
        ? 'checking'
        : (acc.type === 'depository' && acc.subtype === 'savings')
          ? 'savings'
          : 'checking';

      const account = await Account.create({
        user: req.userId,
        bankName: acc.name || 'Plaid Account',
        accountType: type,
        accountNumber: acc.mask ? `****${acc.mask}` : `****${acc.account_id?.slice(-4) || '0000'}`,
        balance: acc.balances?.current ?? 0,
        plaidAccountId: acc.account_id,
        plaidItemId: itemId,
      });
      created.push(account);
    }

    res.status(201).json({
      message: 'Bank account(s) linked successfully',
      itemId,
      accountsLinked: created.length,
      accounts: created,
    });
  } catch (error) {
    console.error('Exchange token error:', error.response?.data || error);
    res.status(500).json({
      message: error.response?.data?.error_message || 'Failed to link bank account',
    });
  }
});

module.exports = router;
