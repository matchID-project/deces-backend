import express from 'express';
import { Queue, JobType } from 'bullmq';
import { Controller, Get, Route, Tags, Path, Query, Request, Security } from 'tsoa';

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
  @Security("jwt", ["user"])
  @Tags('Jobs')
  @Get('{queueName}')
  public async getJobs(
    @Request() request: express.Request,
    @Path() queueName: 'jobs',
    @Query() jobId?: string,
    @Query() jobsType?: JobType,
  ): Promise<any> {
    const scopes = (request as any).user && (request as any).user.scopes
    const user = (request as any).user && (request as any).user.user
    const jobQueue = new Queue(queueName,  {
      connection: {
        host: 'redis'
      }
    });
    const jobsTypeList: JobType[] = ['completed', 'failed', 'active', 'delayed', 'waiting', 'waiting-children', 'paused', 'repeat', 'wait', 'prioritized']
    if (jobsTypeList.includes(jobsType)) {
      const jobs = await jobQueue.getJobs(jobsType);
      let jobsUser;
      if (scopes.includes('admin')) {
        jobsUser = jobs;
        // admin should not see randomKey
        jobsUser.forEach((j: any) => j.data.randomKey = undefined)
      } else {
        // user only see their jobs, and get their randomKey to be able to get their files
        jobsUser = jobs.filter((job: any) => job.data.user === user);
      }
      return { jobs: jobsUser };
    } else if (jobId) {
      const job = await jobQueue.getJob(jobId)
      if (job) {
        if (scopes.includes('admin')) {
          job.data.randomKey = undefined;
        }
        return { job };
      } else {
        return { msg: 'job not found' };
      }
    } else {
      let jobs:any = []
      for (const jobType of jobsTypeList) {
        const jobsTmp = await jobQueue.getJobs(jobType);
        let jobsTmpUser;
        if (scopes.includes('admin')) {
          jobsTmpUser = jobsTmp;
        } else {
          jobsTmpUser = jobsTmp.filter((job: any) => job.data.user === user);
        }
        jobsTmpUser.forEach((j: any) => {
          j.status = jobType;
          if (scopes.includes('admin')) {
            j.data.randomKey = undefined;
          }
        });
        jobs = [...jobs, ...jobsTmpUser]
      }
      return { jobs };
    }

  }

}
