import Queue from 'bee-queue';
import { Controller, Get, Route, Tags, Path  } from 'tsoa';

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
}
