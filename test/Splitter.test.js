/* global artifacts, beforeEach, contract, it */
/* jshint expr: true */

const { expect, use } = require('chai')
const { balance, expectEvent, expectRevert, send, ether } = require('openzeppelin-test-helpers')
const BN = require('bn.js')

use(require('chai-bn')(BN))

const Splitter = artifacts.require('Splitter')

const user0 = '0xec83291a610B95E661fD3Cbb467C52fDBBa6BE59'
const user1 = '0xBEdFe70181A5eaB264a25475fca6E7e2Aa3A9Aa4'
const user2 = '0x8ef82f25FdF5F4Bd5adE15F5C0A23c9817B72383'

contract('Splitter', ([_, creator]) => {
  let splitter

  beforeEach(async () => {
    splitter = await Splitter.new({ from: creator })
  })

  describe('Payment split', () => {
    it('splits the payments to the accounts internally', async () => {
      await splitter.addRecipient([user1, 5000])
      await splitter.addRecipient([user2, 5000])

      await send.ether(user0, splitter.address, ether('1'))

      expect(await splitter.balanceOf(user0)).to.be.a.bignumber.equal(ether('0'))
      expect(await splitter.balanceOf(user1)).to.be.a.bignumber.equal(ether('.5'))
      expect(await splitter.balanceOf(user2)).to.be.a.bignumber.equal(ether('.5'))
    })

    it('sends the balance to the recipients addresses on chain', async () => {
      await splitter.addRecipient([user1, 5000])
      await splitter.addRecipient([user2, 5000])

      await send.ether(user0, splitter.address, ether('1'))

      const balanceTracker1 = await balance.tracker(user1)
      const balanceTracker2 = await balance.tracker(user2)

      await splitter.transfer()

      expect(await splitter.balanceOf(user1)).to.be.a.bignumber.equal(ether('0'))
      expect(await splitter.balanceOf(user2)).to.be.a.bignumber.equal(ether('0'))

      expect(await balanceTracker1.delta()).to.be.bignumber.equal(ether('.5'))
      expect(await balanceTracker2.delta()).to.be.bignumber.equal(ether('.5'))
    })

    it('withdraws correctly', async () => {
      await splitter.addRecipient([user1, 5000])
      await splitter.addRecipient([user2, 5000])

      await send.ether(user0, splitter.address, ether('1'))

      const balanceTracker1 = await balance.tracker(user1)
      const balanceTracker2 = await balance.tracker(user2)

      await splitter.withdraw(ether('.5'), { from: user1 })
      await splitter.withdraw(ether('.2'), { from: user2 })

      expect(await splitter.balanceOf(user1)).to.be.a.bignumber.equal(ether('0'))
      expect(await splitter.balanceOf(user2)).to.be.a.bignumber.equal(ether('.3'))

      // Using approximated numbers to account on gas usage
      expect(await balanceTracker1.delta()).to.be.bignumber.that.is.at.least(ether('.499'))
      expect(await balanceTracker2.delta()).to.be.bignumber.that.is.at.least(ether('.199'))
    })

    it('logs deposit and redeem events', async () => {
      await splitter.addRecipient([user1, 5000])
      await splitter.addRecipient([user2, 5000])

      const receipt = await send.ether(user0, splitter.address, ether('1'))
      expectEvent.inTransaction(
        receipt.transactionHash,
        Splitter,
        'BalanceDeposit',
        { account: user1, amount: ether('.5') }
      )
      expectEvent.inTransaction(
        receipt.transactionHash,
        Splitter,
        'BalanceDeposit',
        { account: user2, amount: ether('.5') }
      )

      const { logs: logs1 } = await splitter.withdraw(ether('.5'), { from: user1 })
      expectEvent.inLogs(logs1, 'BalanceRedeem', { account: user1, amount: ether('.5') })

      const { logs: logs2 } = await splitter.transfer()
      expectEvent.inLogs(logs2, 'BalanceRedeem', { account: user2, amount: ether('.5') })
    })
  })

  describe('Recipient management', () => {
    it('adds recipients correctly', async () => {
      let recipients

      recipients = await splitter.getRecipients(user0)
      expect(recipients).to.be.an('array').that.is.empty

      await splitter.addRecipient([user1, 5000])
      await splitter.addRecipient([user2, 5000])

      recipients = await splitter.getRecipients(user0)
      expect(recipients).to.be.an('array').that.is.deep.equal([
        [user1, '5000'],
        [user2, '5000']
      ])
    })

    it('fails to add more than 100%', async () => {
      await splitter.addRecipient([user1, 5000])
      await splitter.addRecipient([user2, 5000])

      await expectRevert(
        splitter.addRecipient([user0, 5000]),
        'Cannot add Recipient, percentage would be greater than 100%'
      )
    })

    it('able to remove recipients', async () => {
      let recipients

      await splitter.addRecipient([user1, 5000])
      await splitter.addRecipient([user2, 5000])

      recipients = await splitter.getRecipients(user0)
      expect(recipients).to.be.an('array').that.is.deep.equal([
        [user1, '5000'],
        [user2, '5000']
      ])

      await splitter.removeAllRecipients()

      recipients = await splitter.getRecipients(user0)
      expect(recipients).to.be.an('array').that.is.empty
    })
  })
})
