import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Title } from '@gnosis.pm/safe-react-components';
import { Contract } from "@ethersproject/contracts";
import { useSafeAppsSDK } from '@gnosis.pm/safe-apps-react-sdk';
import Rescuers from './rescuers';

interface Props {
  manager: Contract,
  module: Contract
}

interface Status {
  label: string,
  showEnableButton: boolean
}

const Dashboard: React.FC<Props> = ({ module, manager }) => {
  const { sdk, safe } = useSafeAppsSDK();
  const [moduleStatus, setModuleStatus] = useState({ label: "loading...", showEnableButton: false });
  const [moduleName, setModuleName] = useState("loading...");

  useEffect(() => {
    const loadName = async () => {
      try {
        setModuleName(await module.NAME())
      } catch (e) {
        console.error(e)
        setModuleName("errored")
      }
    };
    loadName();
    const loadEnabled = async () => {
      try {
        const modules = await manager.getModules()
        console.log(modules)
        console.log(module.address)
        const enabled = modules.includes(module.address)
        setModuleStatus({ label: enabled ? "enabled" : "disabled", showEnableButton: !enabled } )
      } catch (e) {
        console.error(e)
        setModuleStatus({ label: "errored", showEnableButton: false })
      }
    };
    loadEnabled();
  }, [manager, module])

  const enableModule = useCallback(async () => {
    try {
        await sdk.txs.send({
            txs: [
                {
                    to: safe.safeAddress,
                    value: '0',
                    data: manager.interface.encodeFunctionData("enableModule", [module.address])
                },
            ],
        });
    } catch (e) {
        console.error(e);
    }
}, [safe, sdk]);

  return (<>
    <Title size="md">Dashboard</Title>
    <div>Name: {moduleName}</div>
    <div>Status: {moduleStatus.label} {!moduleStatus.showEnableButton || <Button size="md" color="primary" onClick={enableModule}>Enable</Button>}</div>
    <Rescuers module={module} enabled={true} />

    </>
  )
}

export default Dashboard;