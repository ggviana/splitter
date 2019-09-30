pragma solidity 0.5.8;
pragma experimental ABIEncoderV2;

import "./math/SafeMath.sol";

contract Splitter {
    using SafeMath for uint256;

    // ============ Constants ============

    uint256 public constant MAX_PERCENTAGE = 10000;

    // ============ Types ============

    struct Setting {
        Recipient[] recipients;
    }

    struct Recipient {
        address payable account;
        uint16 percentage;
    }

    // ============ Private variables ============

    mapping(address => Setting) private settings;
    mapping(address => uint256) private balances;

    // ============ Events ============

    event BalanceDeposit(address account, uint256 amount);
    event BalanceRedeem(address account, uint256 amount);

    // ============ External functions ============

    function() external payable {
        splitPayment(msg.value);
    }

    function transfer() external returns (bool) {
        Recipient[] memory recipients = settings[msg.sender].recipients;

        for (uint256 i = 0; i < recipients.length; i++) {
            Recipient memory recipient = recipients[i];
            redeem(recipient.account);
        }

        redeem(msg.sender);

        return true;
    }

    function balanceOf(address _account) external view returns (uint256 amount) {
        return balances[_account];
    }

    function withdraw(uint256 _amount) external returns (uint256 remainingAmount) {
        require(_amount <= balances[msg.sender]);

        redeem(msg.sender, _amount);

        return balances[msg.sender];
    }

    function getRecipients(address _account) external view returns (Recipient[] memory) {
        return settings[_account].recipients;
    }

    function addRecipient(Recipient memory recipient) public returns (Recipient[] memory) {
        Recipient[] storage recipients = settings[msg.sender].recipients;
        uint256 sum = totalPercentageOf(recipients);

        require(
            sum.add(recipient.percentage) <= MAX_PERCENTAGE,
            "Cannot add Recipient, percentage would be greater than 100%"
        );

        recipients.push(recipient);

        return recipients;
    }

    function removeAllRecipients() external returns (bool removed) {
        settings[msg.sender].recipients.length = 0;

        return true;
    }

    // ============ Internal functions ============

    function splitPayment(uint256 _amount) internal {
        Recipient[] memory recipients = settings[msg.sender].recipients;
        uint256 distributed = 0;

        for (uint256 i = 0; i < recipients.length; i++) {
            Recipient memory recipient = recipients[i];
            uint256 share = calculateShare(_amount, recipient.percentage);

            distributed = distributed.add(share);
            deposit(recipient.account, share);
        }

        uint256 remainder = _amount.sub(distributed);

        deposit(msg.sender, remainder);
    }

    function totalPercentageOf(Recipient[] memory recipients) internal pure returns (uint256 percentageSum) {
        uint256 sum = 0;

        for (uint256 i = 0; i < recipients.length; i++) {
            sum = sum.add(recipients[i].percentage);
        }

        return sum;
    }

    function calculateShare(uint256 total, uint16 percentage) internal pure returns (uint256 share) {
        return total.div(MAX_PERCENTAGE.div(percentage));
    }

    function deposit(address _account, uint256 _amount) internal {
        if (_amount > 0) {
            balances[_account] = balances[_account].add(_amount);

            emit BalanceDeposit(_account, _amount);
        }
    }

    function redeem(address payable _account) internal {
        uint256 redeemableAmount = balances[_account];
        redeem(_account, redeemableAmount);
    }

    function redeem(address payable _account, uint256 _amount) internal {
        if (_amount > 0) {
            balances[_account] = balances[_account].sub(_amount);
            _account.transfer(_amount);

            emit BalanceRedeem(_account, _amount);
        }
    }
}
