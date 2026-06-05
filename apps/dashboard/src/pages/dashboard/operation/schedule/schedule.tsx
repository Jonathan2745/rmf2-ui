import { useEffect } from 'react';
import { Box, Button, Flex, Spacer } from '@chakra-ui/react';
import { Horizon } from '@rmf2-ui/chakra';
import Card = Horizon.Card;
import type { RTS } from '@rmf2-ui/data';
import { RTOConfig, LauncherConfig } from '@/clients';
import { LightMode } from '@/components/ui/color-mode';
import { toaster } from '@/components/ui/toaster';
import { Pending } from '@/components/pending';
import { DateTimeSelector } from './components/date-time-selector';
import { ScheduleGantt } from './components/schedule-gantt';
import { useRTSClient } from '@/clients/rts';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';

export function Schedule() {
  // Chakra Color Mode
  const currentDate = new Date();
  const client = useRTSClient();
  const queryClient = useQueryClient();
  const {
    isPending: isPendingGetSchedule,
    data: tasks,
    error: errorGetScedule,
    isError: isErrorGetScedule,
  } = useQuery({
    queryKey: ['RTSSchedule'],
    queryFn: async (): Promise<RTS.Task[]> => {
      const schedule = await client.getSchedule({ offset: 0, limit: 100 });
      return schedule.tasks || [];
    },
    staleTime: 50 * 1000,
    gcTime: 0,
  });

  const sendTaskRTS = async () => {
    // TODO(anyone): fix response header to remove the try-catch
    try {
      await fetch(LauncherConfig.BASE + '/send_task', {
        method: 'POST',
        headers: {
          Accept: '*',
        },
      });
    } catch (e) {
      console.error(e);
    }
  };

  const sendTaskRTO = async () => {
    // TODO(anyone): fix response header to remove the try-catch
    try {
      await fetch(RTOConfig.BASE + '/send_task', {
        method: 'POST',
        headers: {
          Accept: '*',
        },
      });
    } catch (e) {
      console.error(e);
    }
  };

  const sendTask = async () => {
    await sendTaskRTS();
    await sendTaskRTO();
    await new Promise((resolve) => setTimeout(resolve, 5 * 1000));
  };

  const { mutateAsync: sendTaskMutation, error: errorSendTask } = useMutation({
    mutationFn: sendTask,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['RTSSchedule'],
      });
    },
  });

  const convertToCSV = (tasks: RTS.Task[]) => {
    if (tasks.length === 0) {
      return '';
    }
    const header = Object.keys(tasks[0]);
    const rows = tasks.map((task) =>
      header
        .map((field) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return JSON.stringify((task as Record<string, any>)[field]);
        })
        .join(','),
    );
    return [header.join(','), ...rows].join('\n');
  };

  const downloadCSV = () => {
    if (!tasks) {
      return;
    }

    const csv = convertToCSV(tasks);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'task-data.csv';
    link.click();
  };

  useEffect(() => {
    if (!isErrorGetScedule) {
      return;
    }

    const toasterId = errorGetScedule.name;

    if (toaster.isVisible(toasterId)) {
      return;
    }

    toaster.create({
      id: toasterId,
      title: 'Error Getting Schedule',
      description: `${errorGetScedule.name}: ${errorGetScedule.message}`,
      type: 'error',
      duration: 10 * 1000,
      closable: true,
    });
  }, [isErrorGetScedule, errorGetScedule]);

  return (
    <Box>
      <Card>
        <Flex direction="column">
          <Flex justify="end" direction={{ base: 'column', sm: 'row' }}>
            <Button
              onClick={() => {
                const promise = sendTaskMutation();
                toaster.promise(promise, {
                  success: {
                    title: 'Successfully Send Task',
                    description: 'Work Order',
                    duration: 5000,
                    closable: true,
                  },
                  error: {
                    title: 'Error Send Task',
                    description: `${errorSendTask?.name}: ${errorSendTask?.message}`,
                    duration: 5000,
                    closable: true,
                  },
                  loading: {
                    title: 'Sending Task...',
                    description: 'Work Order',
                  },
                });
              }}
              colorPalette="blue"
              mt="5px"
              disabled={isErrorGetScedule}
            >
              Send Task
            </Button>
            <LightMode>
              <Button
                onClick={downloadCSV}
                colorPalette="orange"
                mt="5px"
                ml="5px"
                disabled={tasks === undefined}
              >
                Export to CSV
              </Button>
            </LightMode>
            <Spacer />

            <DateTimeSelector currentDate={currentDate} />
          </Flex>
          <ScheduleGantt tasks={tasks ?? []} />
          {isPendingGetSchedule && (
            <Pending.Root>
              <Pending.Overlay />
              <Pending.Spinner />
            </Pending.Root>
          )}
        </Flex>
      </Card>
    </Box>
  );
}
