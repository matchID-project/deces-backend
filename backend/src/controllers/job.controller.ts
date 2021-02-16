import Queue from 'bee-queue';
import { Controller, Get, Route, Tags, Path, Query  } from 'tsoa';

@Route('queue')
export class JobsController extends Controller {


  @Tags('Jobs')
  @Get('/{queueName}')
  public async jobName(
    @Path() queueName: 'jobs'|'chunks' = 'jobs'
  ): Promise<any> {
    if (queueName !== undefined) {
      const jobQueue = new Queue(queueName,  {
        redis: {
          host: 'redis'
        }
      });
      const jobs = await jobQueue.checkHealth();
      const checkStalledJobs = new Promise((resolve, reject) => {
        jobQueue.checkStalledJobs((err, numStalled) => {
          if (err) reject(err.toString())
          resolve(numStalled)
        })
      });
      const stalled = await checkStalledJobs
      return { ...jobs, stalled };
    } else {
      return {msg: 'available queues: "chunks" and "jobs"'};
    }
  }

  @Tags('Jobs')
  @Get('/{queueName}/{jobsType}')
  public async getJobs(
    @Path() queueName: 'jobs'|'chunks',
    @Path() jobsType: string,
    @Query() size?: number,
    @Query() start?: number,
    @Query() end?: number,
  ): Promise<any> {
    const jobQueue = new Queue(queueName,  {
      redis: {
        host: 'redis'
      }
    });
    if (['waiting', 'active', 'delayed', 'succeeded', 'failed'].includes(jobsType)) {
      const page = {
        size: size || 20,
        start: start || 0,
        end: end || 25
      }
      const jobs = await jobQueue.getJobs(jobsType, page)
      return { jobs };
    } else {
      const jobs = await jobQueue.getJob(jobsType)
      if (jobs) {
        return { jobs };
      } else {
        return { msg: 'job not found' };
      }
    }

  }

}
