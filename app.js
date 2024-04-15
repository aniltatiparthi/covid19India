const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'covid19India.db')
let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Success')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

const convertStateDbToResponseObject = dbObject => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  }
}

// API 1
app.get('/states/', async (request, response) => {
  const getStatesQuery = `
  SELECT 
    *
  FROM 
    state;`
  const statesArray = await db.all(getStatesQuery)
  response.send(
    statesArray.map(eachState => convertStateDbToResponseObject(eachState)),
  )
})

// API 2 Returns a state based on the state ID
app.get('/states/:stateId/', async (request, response) => {
  const {stateId} = request.params
  const getStateQuery = `
  SELECT
    *
  FROM 
    state
  WHERE 
    state_id= ${stateId}`
  const getState = await db.get(getStateQuery)
  response.send(convertStateDbToResponseObject(getState))
})

// API 3 Create a district in the district table
app.post('/districts/', async (request, response) => {
  const districtDetails = request.body
  const {districtName, stateId, cases, cured, active, deaths} = districtDetails
  const addDistrictQuery = `
  INSERT INTO
    district (district_name, state_id, cases, cured, active, deaths)
  VALUES(
    '${districtName}',
    ${stateId},
    ${cases},
    ${cured},
    ${active},
    ${deaths})`
  const districtDatabse = await db.run(addDistrictQuery)
  response.send('District Successfully Added')
})

const convertDistrictsToPascalCase = dbObject => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  }
}

// API 4 Returns a district based on the district ID
app.get('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const getDistrictQuery = `
  SELECT
    *
  FROM 
    district
  WHERE 
    district_id= ${districtId}`
  const districtDetailsDatabase = await db.get(getDistrictQuery)
  response.send(convertDistrictsToPascalCase(districtDetailsDatabase))
})

// API 5 Deletes a district from the district table based on the district ID
app.delete('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const deleteDistrictQuery = `
  DELETE FROM
    district
  WHERE
    district_id= ${districtId}`
  await db.run(deleteDistrictQuery)
  response.send('District Removed')
})

// API 6 Updates the details of a specific district based on the district ID
app.put('/districts/:districtId/', async (request, response) => {
  const {districtId} = request.params
  const details = request.body
  const {districtName, stateId, cases, cured, active, deaths} = details
  const updateDistrictQuery = `
  UPDATE
   district
  SET 
    district_name= '${districtName}',
    state_id= ${stateId},
    cases= ${cases},
    cured= ${cured},
    active= ${active},
    deaths= ${deaths} 
  WHERE district_id= ${districtId}`
  await db.run(updateDistrictQuery)
  response.send('District Details Updated')
})

// API 7 Returns the statistics of total cases, cured, active, deaths of a specific state based on state ID
app.get('/states/:stateId/stats/', async (request, response) => {
  const {stateId} = request.params
  const getStateStatsQuery = `
  SELECT
    SUM(cases),
    SUM(cured),
    SUM(active),
    SUM(deaths)
  FROM 
    district
  WHERE 
    state_id= ${stateId}`
  const stats = await db.get(getStateStatsQuery)
  //console.log(stats)
  response.send({
    totalCases: stats['SUM(cases)'],
    totalCured: stats['SUM(cured)'],
    totalActive: stats['SUM(active)'],
    totalDeaths: stats['SUM(deaths)'],
  })
})

// API 8 Returns an object containing the state name of a district based on the district ID
app.get('/districts/:districtId/details/', async (request, response) => {
  const {districtId} = request.params
  const getStateNameQuery = `
  SELECT
    state_name as stateName
  FROM 
    district INNER JOIN state ON district.state_id = state.state_id
  WHERE
    district_id= ${districtId}`
  const stateName = await db.get(getStateNameQuery)
  response.send(stateName)
})

module.exports = app
