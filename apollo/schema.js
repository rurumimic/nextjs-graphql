import { loadSchemaSync } from '@graphql-tools/load'
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader'

const schema = loadSchemaSync('apollo/schema.graphql',
{ loaders: [new GraphQLFileLoader()] })
