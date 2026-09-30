// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Records a file hash per wallet. Does not certify authorship or ownership.
contract ProofMark {
    mapping(address => mapping(bytes32 => uint256)) public recordedAt;
    event Recorded(address indexed registrant, bytes32 indexed fileHash, uint256 timestamp);

    function register(bytes32 fileHash) external {
        require(fileHash != bytes32(0), "Empty hash");
        require(recordedAt[msg.sender][fileHash] == 0, "Already registered");
        recordedAt[msg.sender][fileHash] = block.timestamp;
        emit Recorded(msg.sender, fileHash, block.timestamp);
    }
}
