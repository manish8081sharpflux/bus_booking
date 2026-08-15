const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')

const routes=fs.readFileSync(
  path.join(
    __dirname,
    '../src/routes/operator.routes.js',
  ),
  'utf8',
)

const limiter=require(
  '../src/middlewares/public-lookup-rate-limit.middleware',
)

const makeRes=()=>({
  statusCode:200,
  headers:{},
  body:null,

  setHeader(k,v){
    this.headers[k]=v
  },

  status(code){
    this.statusCode=code
    return this
  },

  json(body){
    this.body=body
    return this
  },
})

const routeBlock=(pathLiteral,method)=>{
  const marker="'"+pathLiteral+"'"
  const markerIndex=routes.indexOf(marker)

  assert.ok(markerIndex>=0)

  const start=routes.lastIndexOf(
    'router.'+method+'(',
    markerIndex,
  )

  const end=routes.indexOf(
    ');',
    markerIndex,
  )

  assert.ok(start>=0 && end>start)

  return routes.slice(
    start,
    end+2,
  )
}

test('check-mobile is protected by public lookup limiter',()=>{
  const block=routeBlock('/check-mobile','get')

  assert.match(
    block,
    /publicLookupRateLimit[\s\S]*checkMobile/,
  )
})

test('application-status is protected by public lookup limiter',()=>{
  const block=routeBlock(
    '/application-status/:mobile',
    'get',
  )

  assert.match(
    block,
    /publicLookupRateLimit[\s\S]*applicationStatus/,
  )
})

test('limiter allows requests within threshold',()=>{
  limiter.__test.buckets.clear()

  const req={
    ip:'198.51.100.10',
  }

  let called=0

  for(
    let i=0;
    i<limiter.__test.MAX_REQUESTS;
    i++
  ){
    const res=makeRes()

    limiter.publicLookupRateLimit(
      req,
      res,
      ()=>{
        called+=1
      },
    )

    assert.equal(
      res.statusCode,
      200,
    )
  }

  assert.equal(
    called,
    limiter.__test.MAX_REQUESTS,
  )
})

test('limiter returns 429 after threshold',()=>{
  limiter.__test.buckets.clear()

  const req={
    ip:'198.51.100.11',
  }

  for(
    let i=0;
    i<limiter.__test.MAX_REQUESTS;
    i++
  ){
    limiter.publicLookupRateLimit(
      req,
      makeRes(),
      ()=>{},
    )
  }

  const res=makeRes()
  let called=false

  limiter.publicLookupRateLimit(
    req,
    res,
    ()=>{
      called=true
    },
  )

  assert.equal(called,false)
  assert.equal(res.statusCode,429)

  assert.match(
    res.body.message,
    /Too many lookup requests/,
  )

  assert.ok(
    Number(
      res.headers['Retry-After'],
    )>=1,
  )
})

test('limiter isolates clients by IP',()=>{
  limiter.__test.buckets.clear()

  const a={
    ip:'198.51.100.12',
  }

  const b={
    ip:'198.51.100.13',
  }

  for(
    let i=0;
    i<limiter.__test.MAX_REQUESTS;
    i++
  ){
    limiter.publicLookupRateLimit(
      a,
      makeRes(),
      ()=>{},
    )
  }

  const res=makeRes()
  let called=false

  limiter.publicLookupRateLimit(
    b,
    res,
    ()=>{
      called=true
    },
  )

  assert.equal(called,true)
  assert.equal(res.statusCode,200)
})

test('limiter bounds tracked client memory',()=>{
  assert.equal(
    limiter.__test.MAX_TRACKED_CLIENTS,
    10000,
  )
})

test('limiter exposes retry and quota headers',()=>{
  limiter.__test.buckets.clear()

  const req={
    ip:'198.51.100.14',
  }

  const res=makeRes()

  limiter.publicLookupRateLimit(
    req,
    res,
    ()=>{},
  )

  assert.equal(
    res.headers['X-RateLimit-Limit'],
    String(
      limiter.__test.MAX_REQUESTS,
    ),
  )

  assert.ok(
    Number(
      res.headers[
        'X-RateLimit-Remaining'
      ],
    )>=0,
  )
})