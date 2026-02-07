// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address,address,uint256) external returns (bool);
    function transfer(address,uint256) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

contract Roulette {
    IERC20 public token;
    address public owner;

    event GamePlayed(address player,uint256 bet,uint256 ammo,bool win,uint256 result);

    constructor(address t) {
        token = IERC20(t);
        owner = msg.sender;
    }

    receive() external payable {}

    function play(uint256 bet,uint256 ammo) external {
        require(ammo >= 1 && ammo <= 5);

        require(
            token.transferFrom(msg.sender,address(this),bet)
        );

        uint256 result =
            (uint256(
                keccak256(
                    abi.encodePacked(
                        block.timestamp,
                        msg.sender,
                        block.prevrandao
                    )
                )
            ) % 6) + 1;

        bool win = result > ammo;

        if (win) {
            uint256 mult = getMultiplier(ammo);
            uint256 payout = bet * mult / 100;

            require(
                token.balanceOf(address(this)) >= payout
            );

            token.transfer(msg.sender,payout);
        }

        emit GamePlayed(msg.sender,bet,ammo,win,result);
    }

    function getMultiplier(uint256 a) public pure returns(uint256){
        if(a==1) return 120;
        if(a==2) return 160;
        if(a==3) return 200;
        if(a==4) return 300;
        if(a==5) return 500;
        return 0;
    }

    function withdrawTokens(uint256 amount) external {
        require(msg.sender==owner);
        token.transfer(owner,amount);
    }
}
