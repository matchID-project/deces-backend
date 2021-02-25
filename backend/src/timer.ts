import events from 'events';
import util from 'util';
import loggerStream from './logger';

const active = process.env.BACKEND_LOG_TIMER ? true : false;

class Reporter {
    constructor() {
        events.EventEmitter.call(this);
    }
}

interface Report {
    store: number[];
    functionName: string;
    duration: number;
    showEveryLines: number;
}

util.inherits(Reporter, events.EventEmitter);

const reporter:any = new Reporter();

const round = (s: number): number => parseFloat(s.toFixed(3));

reporter.on('report', function (report: Report) {
  report.store.push(report.duration);
  if ((report.store.length % report.showEveryLines) === 0) {
    const sum = (report.store.reduce(function (a, b) {
        return a + b;
        }));

    loggerStream.write(JSON.stringify({
        backend: {
            "server-date": new Date(Date.now()).toISOString(),
            perf: {
                function: report.functionName,
                "process-time": {
                    mean: round(sum/report.store.length),
                    total:round(sum)
                },
                "calls": { "total": report.store.length }
            }
        }
    }));
  }
});

function isAsync (func: any) {
    return /=>\s*__awaiter/.test(func.toString().trim());
}

export default function (fn: any, name: string, showEveryLines?: number) {
  if (!active) {
      return fn;
  }
  const store: any = [];

  let fnName: string;
  if (name) {
    fnName = name;
  } else {
    const match = fn.toString().match(/\w+(?=(\s){0,1}\()/);
    fnName = name || (match) ? match[0] : 'anonymous';
  }

  if (isAsync(fn)) {
    return async function decorated (...args: any[]) {
        const start = process.hrtime();
        // eslint-disable-next-line prefer-rest-params
        const result = await fn.apply(this, args);
        const diff = process.hrtime(start);
        const ms = (diff[0] * 1e9 + diff[1])/1000000;
        reporter.emit('report', {
            functionName: fnName,
            duration: ms,
            showEveryLines: showEveryLines || 100,
            store
        });
        return result;
    };
  } else {
    return function decorated (...args: any[]) {
        const start = process.hrtime();
        // eslint-disable-next-line prefer-rest-params
        const result = fn.apply(this, args);
        const diff = process.hrtime(start);
        const ms = (diff[0] * 1e9 + diff[1])/1000000;
        reporter.emit('report', {
            functionName: fnName,
            duration: ms,
            showEveryLines: showEveryLines || 100,
            store
        });
        return result;
    };
  }
}

