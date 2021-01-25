import { utils, BigNumber } from "ethers"
import { pullByKeccak, pushWithKeccack } from './ipfs'

const localOrIpfs = async (key: string): Promise<string> => {
    let out = localStorage.getItem(`ipfs_cache_${key}`)
    if (!out) {
        out = await pullByKeccak(key)
        localStorage.setItem(`ipfs_cache_${key}`, out)
    }
    return out
}

export interface AnnouncementDetails {
    executor: string,
    to: string,
    value: BigNumber,
    data: string,
    operation: number,
    nonce: BigNumber
}

export const pullDetails = async (txHash: string): Promise<AnnouncementDetails> => {
    const hashImage = await localOrIpfs(txHash)
    console.warn({hashImage})
    const txImage = await localOrIpfs(hashImage.substring(68))
    const executor = utils.getAddress(txImage.substring(64 + 24, 2 * 64))
    const to = utils.getAddress(txImage.substring(2 * 64 + 24, 3 * 64))
    const value = BigNumber.from("0x" + txImage.substring(3 * 64, 4 * 64))
    const dataImage = await localOrIpfs(txImage.substring(4 * 64, 5 * 64))
    const data = "0x" + dataImage
    const operation = parseInt(txImage.substring(5 * 64, 6 * 64), 16)
    const nonce = BigNumber.from("0x" + txImage.substring(6 * 64, 7 * 64))
    return {
        executor, to, value, data, operation, nonce
    }
}

export const pushDetails = async (hashImage: string, details: AnnouncementDetails): Promise<void> => {
    await pushWithKeccack(hashImage)
    await pushWithKeccack(details.data)
    const dataHash = utils.hexZeroPad(utils.keccak256(utils.arrayify(details.data)), 32)
    console.warn({dataHash})
    const abiCoder = new utils.AbiCoder()
    const txImage = abiCoder.encode(
        ["bytes32", "address", "address", "uint256", "bytes32", "uint8", "uint256"], 
        ["0x26b3c09c30e365f49b0eb65e39ec1e16b5ebaded063648e49599b6b8abc3ba86", details.executor, details.to, details.value, dataHash, details.operation, details.nonce]
    )
    await pushWithKeccack(txImage)
    console.warn(utils.hexZeroPad(utils.keccak256(utils.arrayify(txImage)), 32))
    console.warn(utils.hexZeroPad(utils.keccak256(utils.arrayify(hashImage)), 32))
}