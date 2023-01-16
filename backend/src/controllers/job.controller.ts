import { Queue, JobType } from 'bullmq';
import { Controller, Get, Route, Tags, Path, Query, Security } from 'tsoa';

/**
 * @swagger
 * tags:
 *   name: Jobs
 *   description: Verifier le status de jobs
 */
@Route('queue')
export class JobsController extends Controller {

  /**
   * Number of jobs
   * @summary Vérifier le nombre de jobs
   * @param name Name of queue
   */
  @Tags('Jobs')
  @Get('')
  public async jobName(
    @Query() name?: 'jobs'|'chunks',
  ): Promise<any> {
    if (name !== undefined) {
      const jobQueue = new Queue(name,  {
        connection: {
          host: 'redis'
        }
      });
      const queueScheduler = new Queue(name, { connection: { host: 'redis'}});
      const jobs = await jobQueue.getJobs(['wait', 'active', 'delayed', 'completed', 'failed']);
      await queueScheduler.close();
      return { jobs };
    } else {
      return {msg: 'available queues: "chunks" and "jobs". Use them as a query parameter. For example name=jobs'};
    }
  }

  /**
   * Jobs details
   * @summary Détails du jobs par type et par id
   * @param queueName Name of queue
   * @param jobsType Jobs type or Id
   */
  @Security("jwt", ["admin"])
  @Tags('Jobs')
  @Get('{queueName}')
  public async getJobs(

    @Path() queueName: 'jobs'|'chunks',
    @Query() jobId?: string,
    @Query() jobsType?: string,
  ): Promise<any> {
    const jobQueue = new Queue(queueName,  {
      connection: {
        host: 'redis'
      }
    });
    if (['wait', 'active', 'delayed', 'completed', 'failed'].includes(jobsType)) {
      const queueScheduler = new Queue(queueName, { connection: { host: 'redis'}});
      const jobs = await jobQueue.getJobs(['wait', 'active', 'delayed', 'completed', 'failed']);
      await queueScheduler.close();
      return { jobs };
    } else if (jobId) {
      const jobs = await jobQueue.getJob(jobsType)
      if (jobs) {
        return { jobs };
      } else {
        return { msg: 'job not found' };
      }
    } else {
      let jobs:any = []
      const mylist: JobType[] = ['wait', 'active', 'delayed', 'completed', 'failed']
      for (const jobType of mylist) {
        const jobsTmp = await jobQueue.getJobs(jobType);
        jobsTmp.forEach((j: any) => {
          j.status = jobType
          delete j.data.randomKey
        });
        jobs = [...jobs, ...jobsTmp]
      }
      return { jobs };
    }

  }

}
