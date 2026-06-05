// Chakra imports
import { Box, SimpleGrid } from '@chakra-ui/react';

// Custom components
import { toaster } from '@/components/ui/toaster';
import { Banner } from '@/components/banner';
import { NetworkStatusCard } from '@/components/card';
import { useState, useEffect } from 'react';
import { LauncherConfig, BrokerStatusConfig } from '@/clients';

export function Network() {
  const [isStartIOCSClicked, setisStartIOCSClicked] = useState(false);

  useEffect(() => {
    const storedStartIOCSClicked =
      localStorage.getItem('isIOCSStarted') === 'true';

    if (storedStartIOCSClicked) {
      setisStartIOCSClicked(storedStartIOCSClicked);
    }
  }, []);

  const [servicesStatus, setServicesStatus] = useState({
    proxy: false,
    mongodb: false,
    redis: false,
    rabbitmq: false,
    postgres: false,
    it_connector: false,
    swagger: false,
    event_mgr: false,
    rmf_proxy: false,
    rmf_logger: false,
    test_logger_database: false,
  });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(BrokerStatusConfig.BASE + '/Status', {
          method: 'GET',
          headers: {
            Accept: '*',
          },
        });
        const data = await response.json();
        setServicesStatus({
          proxy: data.data.redis.status,
          mongodb: data.data.mongodb.status,
          redis: data.data.redis.status,
          rabbitmq: data.data.rabbitmq.status,
          postgres: data.data.postgres.status,
          it_connector: data.data.it_connector.status,
          swagger: data.data.swagger.status,
          event_mgr: data.data.event_mgr.status,
          rmf_proxy: data.data.rmf_proxy.status,
          rmf_logger: data.data.rmf_logger.status,
          test_logger_database: data.data['test-logger-database'].status,
        });
      } catch (_error) {
        // console.error('Error fetching status:', error);

        setServicesStatus({
          proxy: false,
          mongodb: false,
          redis: false,
          rabbitmq: false,
          postgres: false,
          it_connector: false,
          swagger: false,
          event_mgr: false,
          rmf_proxy: false,
          rmf_logger: false,
          test_logger_database: false,
        });
      }
    };

    fetchStatus();
    const intervalId = setInterval(fetchStatus, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const stopIOCS = async () => {
    console.log('Stop Network button clicked.');
    toaster.create({
      title: 'Stop Network',
      description: `Stopping Network `,
      type: 'success',
      duration: 5000,
      closable: true,
    });
    setisStartIOCSClicked(false);
    localStorage.setItem('isIOCSStarted', 'false');

    try {
      const response = await fetch(LauncherConfig.BASE + '/stop_iocs', {
        method: 'POST',
        headers: {
          Accept: '*',
        },
      });

      const result = await response.text();
      console.log('Task stopped:', result);
    } catch (error) {
      console.error('Failed to stop task:', error);
    }
  };

  const startIOCS = async () => {
    console.log('Start Network button clicked.');
    toaster.create({
      title: 'Network Started',
      description: `Network Starting`,
      type: 'success',
      duration: 5000,
      closable: true,
    });

    setisStartIOCSClicked(true);
    localStorage.setItem('isIOCSStarted', 'true');

    try {
      const response = await fetch(LauncherConfig.BASE + '/start_iocs', {
        method: 'POST',
        headers: {
          Accept: '*',
        },
      });

      const result = await response.text();
      console.log('Simulation started:', result);
    } catch (error) {
      console.error('Failed to start simulation:', error);
    }
  };

  return (
    <Box>
      {/* Main Fields */}

      <Banner.Root>
        <Banner.Header>Unleashing the Power of Connectivity</Banner.Header>
        <Banner.Content>
          <Banner.Button onClick={startIOCS} disabled={isStartIOCSClicked}>
            Start Network
          </Banner.Button>
          <Banner.Button onClick={stopIOCS} disabled={!isStartIOCSClicked}>
            Stop Network
          </Banner.Button>
        </Banner.Content>
      </Banner.Root>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap="20px" mt="20px">
        <NetworkStatusCard
          name="Monitoring Service"
          description="Used for monitoring internal IOCS servicesr"
          isOnline={servicesStatus.mongodb}
        />
        <NetworkStatusCard
          name="Proxy Service"
          description="Used for forwarding messages to databases, handling routing and message transformation."
          isOnline={servicesStatus.proxy}
        />
        <NetworkStatusCard
          name="Logging Service"
          description="Service for storing data into database"
          isOnline={servicesStatus.rmf_logger}
        />
        <NetworkStatusCard
          name="RabbitMQ Service"
          description="Service bus data broadcasting using exchange "
          isOnline={servicesStatus.rabbitmq}
        />
        <NetworkStatusCard
          name="Postgres Service"
          description="Used for Data analytics, NGSI-LD Context broker, IT Connectors Configuration "
          isOnline={servicesStatus.postgres}
        />
        <NetworkStatusCard
          name="Data Model Repository Service"
          description="Internal storage for data model "
          isOnline={servicesStatus.redis}
        />
        <NetworkStatusCard
          name="IT-Connector Service"
          description="IT data pipeline from external data source to context broker"
          isOnline={servicesStatus.it_connector}
        />
        <NetworkStatusCard
          name="EventManager Service"
          description="Processes and managers system event triggers"
          isOnline={servicesStatus.event_mgr}
        />
      </SimpleGrid>
    </Box>
  );
}

export default Network;
