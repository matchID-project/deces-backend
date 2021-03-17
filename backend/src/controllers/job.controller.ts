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
   * @param queueName Name of queue
   */
  @Tags('Jobs')
  @Get('/{queueName}')
  public async jobName(
    @Path() queueName?: 'jobs'|'chunks'
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
    } else if (jobsType === 'stalled') {
      const checkStalledJobs = new Promise((resolve, reject) => {
        jobQueue.checkStalledJobs((err, numStalled) => {
          if (err) reject(err.toString())
          resolve(numStalled)
        })
      });
      const stalled = await checkStalledJobs
      return { jobs: stalled}
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
