import { ApolloServer } from 'apollo-server-micro'
import { createContext } from '../../schema/context'
import schema from '../../schema'

const apolloServer = new ApolloServer({
  schema,
  context: createContext,
  engine: {
    apiKey: process.env.APOLLO_KEY,
  },
})

export const config = {
  api: {
    bodyParser: false,
  },
}

export default apolloServer.createHandler({ path: '/api/graphql' })
