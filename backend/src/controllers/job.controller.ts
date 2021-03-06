import Queue from 'bee-queue';
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
      return {msg: 'available queues: "chunks" and "jobs". Use them as a query parameter. For example name=jobs'};
    }
  }

  /**
   * Jobs details
   * @summary Détails du jobs par type et par id
   * @param queueName Name of queue
   * @param jobsType Jobs type or Id
   * @param size Number of returned jobs in list
   * @param start Jobs list page start
   * @param end Jobs list page end
   */
  @Security("jwt", ["admin"])
  @Tags('Jobs')
  @Get('{queueName}')
  public async getJobs(
    @Path() queueName: 'jobs'|'chunks',
    @Query() jobId?: string,
    @Query() jobsType?: string,
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
    if (['waiting', 'active', 'delayed', 'succeeded', 'failed'].includes(jobsType)) {
      const jobs = await jobQueue.getJobs(jobsType, page)
      jobs.forEach(j => delete j.queue);
      return { jobs };
    } else if (jobsType === 'stalled') {
      const checkStalledJobs = new Promise((resolve, reject) => {
        jobQueue.checkStalledJobs((err, numStalled) => {
          if (err) reject(err.toString())
          resolve(numStalled)
        })
      });
      const stalled = await checkStalledJobs
      return { jobs: stalled}
    } else if (jobId) {
      const jobs = await jobQueue.getJob(jobsType)
      if (jobs) {
        return { jobs };
      } else {
        return { msg: 'job not found' };
      }
    } else {
      let jobs:any = []
      const mylist = ['waiting', 'active', 'delayed', 'succeeded', 'failed']
      for (const jobType of mylist) {
        const jobsTmp = await jobQueue.getJobs(jobType, page)
        jobsTmp.forEach(j => {
          delete j.queue
          delete j.data.randomKey
        });
        jobs = [...jobs, ...jobsTmp]
      }
      return { jobs };
    }

  }

}
