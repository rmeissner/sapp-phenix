import CID from 'cids'
import IpfsClient from 'ipfs-http-client'
import { utils } from 'ethers'

const ipfs: any = IpfsClient({
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https'
});

const removeHexPrefix = (input: string) => input.toLowerCase().startsWith("0x") ? input.slice(2) : input

export const pullByKeccak = async (hashPart: string, encoding?: string): Promise<string> => {
    const multhash = Buffer.concat([Buffer.from("1b20", "hex"), Buffer.from(removeHexPrefix(hashPart), "hex")])
    const cid = new CID(1, "raw", multhash, "base32")
    let out = ""
    for await (const file of ipfs.get(cid.toString())) {
        if (!file.content) continue;
        const content = []
        for await (const chunk of file.content) {
            content.push(chunk)
        }
        out += content.map(c => c.toString(encoding || 'hex')).join()
    }
    return out
}

export const pushWithKeccack = async (data: string) => {
    // Note: it is important that we hand it to ipfs as an array and not a string
    const res = await ipfs.add(utils.arrayify(data), { hashAlg: "keccak-256" })
    console.warn({data})
    console.warn(`ipfs res: ${res.path}`)
}
