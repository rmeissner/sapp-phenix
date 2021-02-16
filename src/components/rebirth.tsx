import React, { useCallback, useState, useEffect } from 'react';
import { Button, Loader, Title } from '@gnosis.pm/safe-react-components';
import { useSafeAppsSDK } from '@gnosis.pm/safe-apps-react-sdk';
import { Contract } from '@ethersproject/contracts';
import { BigNumber } from 'ethers';
import { AnnouncementDetails, pullDetails, pushDetails } from '../utils/info';

interface Props {
  module: Contract;
  manager: Contract;
}

interface Config {
  executor: string;
  delay: BigNumber;
  blockNumber: number;
  transactionIndex: number;
  logIndex: number;
}

interface Announcement {
  executor: string;
  txHash: string;
  executed: boolean;
  execTime: number;
  blockNumber: number;
  transactionIndex: number;
  logIndex: number;
}

const Rebirth: React.FC<Props> = ({ manager, module }) => {
  const { sdk, safe } = useSafeAppsSDK();
  const [breeding, setBreeding] = useState(false);
  const [phenixes, setPhenixes] = useState<Config[] | undefined>(undefined);
  const [hetchlings, setHetchlings] = useState<Announcement[] | undefined>(undefined);

  const loadEggs = useCallback(async () => {
    try {
      console.log('loadEggs');
      const filter = module.filters.UpdatedConfig(null, safe.safeAddress);
      const events = await module.queryFilter(filter);
      const results: Record<string, Config> = {};
      for (const e of events) {
        const event = module.interface.decodeEventLog('UpdatedConfig', e.data, e.topics);
        const currentEntry = results[event.announcer];
        if (
          currentEntry &&
          (currentEntry.blockNumber > e.blockNumber ||
            (currentEntry.blockNumber === e.blockNumber && currentEntry.transactionIndex > e.transactionIndex) ||
            (currentEntry.blockNumber === e.blockNumber &&
              currentEntry.transactionIndex === e.transactionIndex &&
              currentEntry.logIndex > e.logIndex))
        ) {
          continue;
        }
        results[event.announcer] = {
          executor: event.executor,
          delay: event.delay,
          blockNumber: e.blockNumber,
          transactionIndex: e.transactionIndex,
          logIndex: e.logIndex,
        };
        console.log({ results });
      }
      setPhenixes(Object.values(results).filter((config) => config.delay > BigNumber.from(0)));
    } catch (e) {
      console.error(e);
      setPhenixes([]);
    }
  }, [module, safe, setPhenixes]);

  const loadHetchlings = useCallback(async () => {
    try {
      console.warn('loadHetchlings');
      const filter = module.filters.NewAnnouncement(null, safe.safeAddress);
      const events = await module.queryFilter(filter);
      console.warn({ events });
      const results: Record<string, Announcement> = {};
      for (const e of events) {
        const event = module.interface.decodeEventLog('NewAnnouncement', e.data, e.topics);
        const currentEntry = results[event.announcer];
        if (
          currentEntry &&
          (currentEntry.blockNumber > e.blockNumber ||
            (currentEntry.blockNumber === e.blockNumber && currentEntry.transactionIndex > e.transactionIndex) ||
            (currentEntry.blockNumber === e.blockNumber &&
              currentEntry.transactionIndex === e.transactionIndex &&
              currentEntry.logIndex > e.logIndex))
        ) {
          continue;
        }
        const cachedAnnouncementInfo = localStorage.getItem(event.txHash);
        let announcementInfo = undefined;
        console.warn({ cachedAnnouncementInfo });
        if (cachedAnnouncementInfo) {
          announcementInfo = JSON.parse(cachedAnnouncementInfo);
        }
        if (
          !announcementInfo ||
          (announcementInfo.execTime <= new Date().getTime() / 1000 && !announcementInfo.executed)
        ) {
          const info = await module.announcements(event.txHash);
          announcementInfo = {
            execTime: info[1].toNumber(),
            executed: info[3],
          };
          localStorage.setItem(event.txHash, JSON.stringify(announcementInfo));
        }
        console.warn({ announcementInfo });
        results[event.txHash] = {
          txHash: event.txHash,
          executor: event.executor,
          blockNumber: e.blockNumber,
          transactionIndex: e.transactionIndex,
          logIndex: e.logIndex,
          ...announcementInfo,
        };
        console.warn({ results });
      }
      setHetchlings(
        Object.values(results).filter((announcement) => !announcement.executed && announcement.execTime > 0),
      );
    } catch (e) {
      console.error(e);
      setHetchlings([]);
    }
  }, [module, safe, setHetchlings]);

  useEffect(() => {
    loadEggs();
    loadHetchlings();
  }, [safe, module, loadEggs, loadHetchlings]);

  const breed = useCallback(
    async (executor) => {
      setBreeding(true);
      try {
        const data = manager.interface.encodeFunctionData('addOwnerWithThreshold', [safe.safeAddress, 1]);
        const announcementDetails: AnnouncementDetails = {
          executor,
          to: executor,
          value: BigNumber.from(0),
          data,
          operation: 0,
          nonce: BigNumber.from(new Date().getTime()),
        };
        const hashImage = await module.generateTransactionHashData(
          announcementDetails.executor,
          announcementDetails.to,
          announcementDetails.value,
          announcementDetails.data,
          announcementDetails.operation,
          announcementDetails.nonce,
        );
        await pushDetails(hashImage, announcementDetails);
        await module.announceTransaction(
          announcementDetails.executor,
          announcementDetails.to,
          announcementDetails.value,
          announcementDetails.data,
          announcementDetails.operation,
          announcementDetails.nonce,
        );
        // TODO: publish info
      } catch (e) {
        console.error(e);
      }
      setBreeding(false);
    },
    [safe, manager, module],
  );

  const hetch = useCallback(
    async (txHash) => {
      try {
        console.warn({ txHash });
        const announcementDetails: AnnouncementDetails = await pullDetails(txHash);
        await module.executeTransaction(
          announcementDetails.executor,
          announcementDetails.to,
          announcementDetails.value,
          announcementDetails.data,
          announcementDetails.operation,
          announcementDetails.nonce,
        );
      } catch (e) {
        console.error(e);
      }
    },
    [sdk, safe, manager, module],
  );

  const now = new Date().getTime() / 1000;
  return (
    <>
      <Title size="md">Rebirth</Title>
      <Title size="sm">Hetchlings</Title>
      {hetchlings === undefined && 'loading...'}
      {hetchlings?.length === 0 && 'No Hetchlings'}
      {hetchlings?.map((hetchling) => (
        <div>
          {hetchling.executor}
          {hetchling.execTime < now && (
            <Button size="md" color="primary" onClick={() => hetch(hetchling.txHash)}>
              Hetch
            </Button>
          )}
          {hetchling.execTime >= now && ` wait until ${new Date(hetchling.execTime * 1000).toLocaleString()}`}
        </div>
      ))}
      <Title size="sm">Phenix Eggs</Title>
      {phenixes === undefined && 'loading...'}
      {phenixes?.length === 0 && 'No Eggs'}
      {phenixes?.map((phenixes) => (
        <div>
          {phenixes.executor}
          {!breeding && (
            <Button size="md" color="primary" onClick={() => breed(phenixes.executor)}>
              Breed
            </Button>
          )}
          {breeding && <Loader size="xs" />}
        </div>
      ))}
    </>
  );
};

export default Rebirth;
