// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

contract ExampleEventEmitter {
  event Initialized(uint initTime, address owner);
  event DataEvent(bytes data);

  struct Data {
    uint256 id;
    uint256[] values;
    address name;
  }

  constructor() payable {
    emit Initialized(block.timestamp, msg.sender);
  }

  function emitSimpleDataEvent() public {
    emit DataEvent(bytes('Hello, World!'));
  }

  function emitStructDataEvent() public {
    uint256[] memory values = new uint256[](3);
    values[0] = 1;
    values[1] = 2;
    values[2] = 3;
    emit DataEvent(abi.encode(Data({ id: 1, values: values, name: address(0xdead) })));
  }
}
