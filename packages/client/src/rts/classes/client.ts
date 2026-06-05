import type { RTS } from '@rmf2-ui/data';
import type {
  Client as ClientGen,
  ClientOptions as ClientOptionsGen,
} from '@/rts/generated/client';
import type { Task as TaskPayload } from '@/rts/generated/types.gen';
import { readScheduleScheduleGet } from '@/rts/generated/sdk.gen';
import { createClient } from '@/rts/generated/client';

export type ClientOptions = ClientOptionsGen;

export class Client {
  private _client: ClientGen;

  constructor(options: ClientOptions) {
    this._client = createClient(options);
  }

  // TODO(anyone): define reusable casting
  private fromTaskPayload(payload: TaskPayload): RTS.Task {
    const task: RTS.Task = {
      id: payload.id,
      type: payload.type,
      description: payload.description ?? undefined,
      startTime: new Date(payload.start_time),
      endTime: payload.end_time ? new Date(payload.end_time) : undefined,
      seriesId: payload.series_id ?? undefined,
      processId: payload.process_id ?? undefined,
      resourceId: payload.resource_id ?? undefined,
      status: payload.status,
      plannedStartTime: payload.planned_start_time
        ? new Date(payload.planned_start_time)
        : undefined,
      plannedEndTime: payload.planned_end_time
        ? new Date(payload.planned_end_time)
        : undefined,
      actualStartTime: payload.actual_start_time
        ? new Date(payload.actual_start_time)
        : undefined,
      actualEndTime: payload.actual_end_time
        ? new Date(payload.actual_end_time)
        : undefined,
      taskDetails: payload.task_details,
    };
    return task;
  }

  async getSchedule(params: {
    startTime?: Date;
    endTime?: Date;
    offset?: number;
    limit?: number;
  }): Promise<RTS.Schedule> {
    const { startTime, endTime, offset, limit } = params;
    const { data } = await readScheduleScheduleGet({
      client: this._client,
      query: {
        start_time: startTime ? startTime.toISOString() : null,
        end_time: endTime ? endTime.toISOString() : null,
        offset: offset,
        limit: limit,
      },
    });

    if (!data) {
      throw ReferenceError('Error: data is undefined.');
    }

    // Map the result data to schedule
    const tasks: RTS.Task[] = [];
    for (const taskPayload of data.tasks) {
      const task = this.fromTaskPayload(taskPayload);
      tasks.push(task);
    }

    const result: RTS.Schedule = {
      tasks: tasks,
      processes: data.processes,
    };
    return result;
  }
}
