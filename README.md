# Splitter

This project aims to provide a easy way to split payments between recipients on the ethereum network

## Usage

### Recipient management

The recipients are basically addresses that receives any payment that a user sends, the recipients receive 
proportionally to the amount of percentage registered.

```javascript
const splitter = new web3.eth.Contract(splitterAbi, splitterAddress)

// Adding a recipient
await splitter.methods.addRecipient([recipientAccount, percentage]).send({ from: account })

// Getting recipients
await splitter.methods.getRecipients().call()

// Removing recipients
await splitter.methods.removeAllRecipients().send({ from: account })
```

### Splitting payments

Having the recipients settled, any payment sent to the contract will be splitted between the recipients and will be 
available for withdraw. You can pay the gas to send all recipients balances at once. If wanted, each owner can pull 
his own funds from the contract. You also can see the balance stored for any account.

```javascript
const splitter = new web3.eth.Contract(splitterAbi, splitterAddress)

// Transfer to recipients accounts
await splitter.methods.transfer().send({ from: account })

// Reading balance
await splitter.methods.balanceOf(account).call()

// Withdraw own balance
await splitter.methods.withdraw(amount).send({ from: account })
```

## Scripts

### `npm run compile`
Compiles the contracts on the `/build` directory.

### `npm run lint`
Show code errors based on `.eslintrc.json` and `.solhintrc.json`.

Run  `npm run lint:fix` for fixing errors on javascript code

### `npm run test`
Tests the contracts using the files at `/test` directory.

