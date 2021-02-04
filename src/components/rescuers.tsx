import React, { useCallback, useEffect, useState } from 'react';
import { Button, TextField, Title } from '@gnosis.pm/safe-react-components';
import { Contract } from "@ethersproject/contracts";
import { useSafeAppsSDK } from '@gnosis.pm/safe-apps-react-sdk';
import { BigNumber } from 'ethers';

interface Props {
  module: Contract,
  enabled: boolean
}

interface Config {
  announcer: string,
  delay: BigNumber,
  blockNumber: number,
  transactionIndex: number,
  logIndex: number
}

const numberZoHHMMSS = (timestamp: number) => {
  const seconds = Math.floor(timestamp) % 60;
  const minutes = Math.floor(timestamp / 60) % 60;
  const hours = Math.floor(timestamp / (60 * 60)) % 24;
  const days = Math.floor(timestamp / (60 * 60 * 24));

  return (days > 0 ? days + "d " : "") + (hours > 0 ? hours + "h " : "") + (minutes > 0 ? minutes + "min " : "") + (seconds > 0 ? seconds + "sec " : "")
}

const Rescuers: React.FC<Props> = ({ module, enabled }) => {
  const { sdk, safe } = useSafeAppsSDK();
  const [newRescuer, setNewRescuer] = useState<string>("")
  const [rescuers, setRescuers] = useState<Config[] | undefined>(undefined)

  const addRescuer = useCallback(async () => {
    try {
        await sdk.txs.send({
            txs: [
                {
                    to: module.address,
                    value: '0',
                    data: module.interface.encodeFunctionData("updateConfig", [newRescuer.trim(), 60, true])
                },
            ],
        });
        setNewRescuer("")
    } catch (e) {
        console.error(e);
    }
  }, [newRescuer, setNewRescuer, sdk, module])

  const removeRescuer = useCallback(async (announcer) => {
    try {
        await sdk.txs.send({
            txs: [
                {
                    to: module.address,
                    value: '0',
                    data: module.interface.encodeFunctionData("updateConfig", [announcer, 0, false])
                },
            ],
        });
    } catch (e) {
        console.error(e);
    }
  }, [sdk, module])

  const loadRescuers = useCallback(async () => {
    try {
      console.log("Rescuers")
      const filter = module.filters.UpdatedConfig(safe.safeAddress)
      const events = await module.queryFilter(filter)
      const rescuers: Record<string, Config> = {} 
      for (const e of events) {
        const event = module.interface.decodeEventLog("UpdatedConfig", e.data, e.topics)
        const currentEntry = rescuers[event.announcer]
        if (currentEntry && (
            (currentEntry.blockNumber > e.blockNumber) || 
            (currentEntry.blockNumber === e.blockNumber && currentEntry.transactionIndex > e.transactionIndex) || 
            (currentEntry.blockNumber === e.blockNumber && currentEntry.transactionIndex === e.transactionIndex && currentEntry.logIndex > e.logIndex))) {
          continue;
        }
        rescuers[event.announcer] = {
          announcer: event.announcer,
          delay: event.delay,
          blockNumber: e.blockNumber,
          transactionIndex: e.transactionIndex,
          logIndex: e.logIndex
  
        }
      }
      console.log({rescuers})
      setRescuers(Object.values(rescuers).filter((config) => config.delay > BigNumber.from(0)))
    } catch {
      setRescuers([])
    }
  }, [module, safe])

  useEffect(() => {
    loadRescuers();
  }, [safe, module, loadRescuers])

  console.log({rescuers})
  return (<>
    <Title size="sm">Rescuers</Title>
    {(enabled && <div><TextField value={newRescuer} label="New Rescuer" onChange={(e) => setNewRescuer(e.target.value)}></TextField><Button size="md" color="primary" onClick={addRescuer}>Add</Button></div>)}
    {rescuers === undefined && "loading..."}
    {rescuers?.length === 0 && "No rescuers"}
    {rescuers?.map(rescuer => <div key={rescuer.announcer}>{rescuer.announcer} ({numberZoHHMMSS(rescuer.delay.toNumber())} delay)<Button size="md" color="primary" onClick={() => removeRescuer(rescuer.announcer)}>Remove</Button></div>)}
  </>
  )
}

export default Rescuers;