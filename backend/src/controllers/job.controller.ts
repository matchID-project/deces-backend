import Queue from 'bee-queue';
import { Controller, Get, Route, Tags, Path, Query  } from 'tsoa';

@Route('queue')
export class JobsController extends Controller {


  @Tags('Jobs')
  @Get('/:queueName(jobs|chunks)/jobs')
  public async jobName(
    @Path() queueName: 'jobs'|'chunks' = 'jobs'
  ): Promise<any> {
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
  }

  @Tags('Jobs')
  @Get('/:queueName(jobs|chunks)/jobs/:jobsType(waiting|active|delayed|succeeded|failed)')
  public async getJobs(
    @Path() queueName: 'jobs'|'chunks',
    @Path() jobsType: 'waiting'|'active'|'delayed'|'succeeded'|'failed',
    @Query() size?: number,
    @Query() start?: number,
    @Query() end?: number,
  ): Promise<any> {
    const jobQueue = new Queue(queueName,  {
      redis: {
        host: 'redis'
      }
    });
    const page = { 
      size: size || 20,
      start: start || 0,
      end: end || 25
    }
    const jobs = await jobQueue.getJobs(jobsType, page)
    return { jobs };
  }

}
