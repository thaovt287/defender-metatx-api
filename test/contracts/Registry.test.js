const { expect } = require("chai");
const { ethers } = require("hardhat");
const { signMetaTxRequest } = require("../../src/signer");

async function deploy(name, ...params) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then(f => f.deployed());
}

describe("contracts/Registry", function() {
  beforeEach(async function() {
    this.forwarder = await deploy('ERC2771Forwarder', "ERC2771Forwarder");
    this.registry = await deploy("Registry", this.forwarder.address);    
    this.accounts = await ethers.getSigners();
  });

  it("registers a name directly", async function() {
    const sender = this.accounts[1];
    const registry = this.registry.connect(sender);
    
    const receipt = await registry.register('defender').then(tx => tx.wait());
    expect(receipt.events[0].event).to.equal('Registered');

    expect(await registry.owners('defender')).to.equal(sender.address);
    expect(await registry.names(sender.address)).to.equal('defender');
  });

  it("registers a name via a meta-tx", async function() {
    const signer = this.accounts[2];
    const relayer = this.accounts[3];
    const forwarder = this.forwarder.connect(relayer);
    const registry = this.registry;

    // const signerPk = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a'

    const request = await signMetaTxRequest(signer.provider, forwarder, {
      from: signer.address,
      to: registry.address,
      data: registry.interface.encodeFunctionData('register', ['meta-txs']),
    });
    
    await forwarder.execute(request).then(tx => tx.wait());

    expect(await registry.owners('meta-txs')).to.equal(signer.address);
    expect(await registry.names(signer.address)).to.equal('meta-txs');
  });
});
