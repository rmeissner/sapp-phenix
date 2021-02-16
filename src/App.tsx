import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Loader } from '@gnosis.pm/safe-react-components';
import { useSafeAppsSDK } from '@gnosis.pm/safe-apps-react-sdk';
import { ethers } from 'ethers';
import DelayedTxModule from './contracts/DelayedTxModule.json';
import Safe from './contracts/Safe1_1_1.json';
import { SafeAppsSdkSigner } from '@gnosis.pm/safe-apps-ethers-provider';
import Rebirth from './components/rebirth';
import Dashboard from './components/dashboard';

const Container = styled.form`
  margin-bottom: 2rem;
  width: 100%;
  max-width: 480px;

  display: grid;
  grid-template-columns: 1fr;
  grid-column-gap: 1rem;
  grid-row-gap: 1rem;
`;

const App: React.FC = () => {
  const { sdk, safe } = useSafeAppsSDK();
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const module = useMemo(() => {
    console.log('create module');
    return new ethers.Contract(DelayedTxModule.address, DelayedTxModule.abi, new SafeAppsSdkSigner(safe, sdk));
  }, [sdk, safe]);

  const manager = useMemo(() => {
    console.log('create manager ' + safe.safeAddress);
    if (!safe.safeAddress) return undefined;
    return new ethers.Contract(safe.safeAddress, Safe.abi, new SafeAppsSdkSigner(safe, sdk));
  }, [sdk, safe]);

  const section = useMemo(() => {
    if (!manager) return <></>;
    switch (selectedTab) {
      case 'rebirth':
        return <Rebirth module={module} manager={manager} />;
      case 'dashboard':
      default:
        return <Dashboard module={module} manager={manager} />;
    }
  }, [selectedTab, module, manager]);

  if (!manager) return <Loader size="md" />;

  return (
    <Container>
      <div>
        <a href="/#" onClick={() => setSelectedTab('dashboard')}>
          Dashboard
        </a>{' '}
        <a href="/#" onClick={() => setSelectedTab('rebirth')}>
          Rebirth
        </a>
      </div>
      {section}
    </Container>
  );
};

export default App;
