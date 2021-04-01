import React, { useCallback, useEffect, useState } from 'react';
import { Button, Title } from '@gnosis.pm/safe-react-components';
import { Contract } from '@ethersproject/contracts';
import Rescuers from './rescuers';

interface Props {
  manager: Contract;
  module: Contract;
}

const Dashboard = ({ module, manager }: Props): React.ReactElement => {
  const [moduleStatus, setModuleStatus] = useState({ label: 'loading...', showEnableButton: false });
  const [moduleName, setModuleName] = useState('loading...');

  useEffect(() => {
    const loadName = async () => {
      try {
        setModuleName(await module.NAME());
      } catch (e) {
        console.error(e);
        setModuleName('errored');
      }
    };
    loadName();
    const loadEnabled = async () => {
      try {
        const modules = await manager.getModules();
        console.log(modules);
        console.log(module.address);
        const enabled = modules.includes(module.address);
        setModuleStatus({ label: enabled ? 'enabled' : 'disabled', showEnableButton: !enabled });
      } catch (e) {
        console.error(e);
        setModuleStatus({ label: 'errored', showEnableButton: false });
      }
    };
    loadEnabled();
  }, [manager, module]);

  const enableModule = useCallback(async () => {
    try {
      await manager.enableModule(module.address);
    } catch (e) {
      console.error(e);
    }
  }, [manager, module.address]);

  return (
    <>
      <Title size="md">Dashboard</Title>
      <div>Name: {moduleName}</div>
      <div>
        Status: {moduleStatus.label}{' '}
        {!moduleStatus.showEnableButton || (
          <Button size="md" color="primary" onClick={enableModule}>
            Enable
          </Button>
        )}
      </div>
      <Rescuers module={module} enabled={true} />
    </>
  );
};

export default Dashboard;
