import { providers } from "ethers";
import { BigNumber } from "@ethersproject/bignumber";
import { BaseProvider, TransactionRequest, Network } from "@ethersproject/providers";
import { checkProperties, deepCopy, Deferrable, defineReadOnly, getStatic, resolveProperties, shallowCopy } from "@ethersproject/properties";
import { Bytes, hexlify, hexValue, isHexString } from "@ethersproject/bytes";
import SafeAppsSDK, { SafeInfo} from '@gnosis.pm/safe-apps-sdk';

import { Logger } from "@ethersproject/logger";

const logger = new Logger("safe_apps_sdk_ethers_provider");

const allowedTransactionKeys: { [ key: string ]: boolean } = {
    chainId: true, data: true, gasLimit: true, gasPrice:true, nonce: true, to: true, value: true
}

function getLowerCase(value: string): string {
    if (value) { return value.toLowerCase(); }
    return value;
}

function timer(timeout: number): Promise<any> {
    return new Promise(function(resolve) {
        setTimeout(resolve, timeout);
    });
}

function checkError(method: string, error: any, params: any): any {
    // Undo the "convenience" some nodes are attempting to prevent backwards
    // incompatibility; maybe for v6 consider forwarding reverts as errors
    if (method === "call" && error.code === Logger.errors.SERVER_ERROR) {
        const e = error.error;
        if (e && e.message.match("reverted") && isHexString(e.data)) {
            return e.data;
        }
    }

    let message = error.message;
    if (error.code === Logger.errors.SERVER_ERROR && error.error && typeof(error.error.message) === "string") {
        message = error.error.message;
    } else if (typeof(error.body) === "string") {
        message = error.body;
    } else if (typeof(error.responseText) === "string") {
        message = error.responseText;
    }
    message = (message || "").toLowerCase();

    throw error;
}

export class SafeAppsSdkProvider extends BaseProvider {

    _safe: SafeInfo;
    _sdk: SafeAppsSDK;

    constructor(safe: SafeInfo, sdk: SafeAppsSDK) {
        super(safe.network.toLowerCase());
        console.log(this.anyNetwork)
        this._safe = safe;
        this._sdk = sdk;
    }

    async detectNetwork(): Promise<Network> {
        let network = this.network;
        if (!network) {
            logger.throwError("no network detected", Logger.errors.UNKNOWN_ERROR, { });
        }
        return network;
    }

    async listAccounts(): Promise<Array<string>> {
        return [this.formatter.address(this._safe.safeAddress)]
    }

    async send(method: string, params: any): Promise<any> {
        switch (method) {
            /* Not supported yet
            case "getBlockNumber":
                return this._sdk.eth.getBlockNumber(params);
            */

            case "getBalance":
                return this._sdk.eth.getBalance([ getLowerCase(params.address), params.blockTag ]);

            case "getCode":
                return this._sdk.eth.getCode([ getLowerCase(params.address), params.blockTag ]);

            case "getStorageAt":
                return this._sdk.eth.getStorageAt([ getLowerCase(params.address), params.position, params.blockTag ]);

            case "getBlock":
                
                if (params.blockTag) {
                    return this._sdk.eth.getBlockByNumber([ params.blockTag, !!params.includeTransactions ]);
                } else if (params.blockHash) {
                    return this._sdk.eth.getBlockByHash([ params.blockHash, !!params.includeTransactions ]);
                }
                logger.throwError("Invalid getBlock arguments", Logger.errors.INVALID_ARGUMENT, params);

            case "getTransaction":
                return this._sdk.eth.getTransactionByHash([ params.transactionHash ]);

            case "getTransactionReceipt":
                return this._sdk.eth.getTransactionReceipt([ params.transactionHash ]);

            case "call": {
                const hexlifyTransaction = getStatic<(t: TransactionRequest, a?: { [key: string]: boolean }) => { [key: string]: string }>(this.constructor, "hexlifyTransaction");
                return this._sdk.eth.call([ hexlifyTransaction(params.transaction, { from: true }), params.blockTag ]);
            }

            case "getLogs":
                if (params.filter && params.filter.address != null) {
                    params.filter.address = getLowerCase(params.filter.address);
                }
                return this._sdk.eth.getPastLogs([ params.filter ]);

            default:
                break;
        }

        console.error("Unsupported method called " + method)
        logger.throwError(method + " not implemented", Logger.errors.NOT_IMPLEMENTED, { operation: method });
    }

    async perform(method: string, params: any): Promise<any> {
        try {
            return await this.send(method, params)
        } catch (error) {
            return checkError(method, error, params);
        }
    }


    // Convert an ethers.js transaction into a JSON-RPC transaction
    //  - gasLimit => gas
    //  - All values hexlified
    //  - All numeric values zero-striped
    //  - All addresses are lowercased
    // NOTE: This allows a TransactionRequest, but all values should be resolved
    //       before this is called
    // @TODO: This will likely be removed in future versions and prepareRequest
    //        will be the preferred method for this.
    static hexlifyTransaction(transaction: TransactionRequest, allowExtra?: { [key: string]: boolean }): { [key: string]: string } {
        // Check only allowed properties are given
        const allowed = shallowCopy(allowedTransactionKeys);
        if (allowExtra) {
            for (const key in allowExtra) {
                if (allowExtra[key]) { allowed[key] = true; }
            }
        }
        checkProperties(transaction, allowed);

        const result: { [key: string]: string } = {};

        // Some nodes (INFURA ropsten; INFURA mainnet is fine) do not like leading zeros.
        ["gasLimit", "gasPrice", "nonce", "value"].forEach(function(key) {
            if ((<any>transaction)[key] == null) { return; }
            const value = hexValue((<any>transaction)[key]);
            if (key === "gasLimit") { key = "gas"; }
            result[key] = value;
        });

        ["from", "to", "data"].forEach(function(key) {
            if ((<any>transaction)[key] == null) { return; }
            result[key] = hexlify((<any>transaction)[key]);
        });

        return result;
    }
}