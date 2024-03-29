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
      return await jobQueue.getJobCounts();
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

    @Path() queueName: 'jobs',
    @Query() jobId?: string,
    @Query() jobsType?: JobType,
  ): Promise<any> {
    const jobQueue = new Queue(queueName,  {
      connection: {
        host: 'redis'
      }
    });
    const jobsTypeList: JobType[] = ['completed', 'failed', 'active', 'delayed', 'waiting', 'waiting-children', 'paused', 'repeat', 'wait']
    if (jobsTypeList.includes(jobsType)) {
      const jobs = await jobQueue.getJobs(jobsType);
      jobs.forEach((j: any) => delete j.data.randomKey)
      return { jobs };
    } else if (jobId) {
      const job = await jobQueue.getJob(jobId)
      delete job.data.randomKey
      if (job) {
        return { job };
      } else {
        return { msg: 'job not found' };
      }
    } else {
      let jobs:any = []
      for (const jobType of jobsTypeList) {
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
