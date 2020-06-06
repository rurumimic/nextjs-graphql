# Next.js with GraphQL

1. Create a Next.js App.

```bash
yarn create next-app

Pick a template › Default starter app
```

2. Create an empty `tsconfig.json`.

```bash
touch tsconfig.json
yarn next
```

3. Install `typescript`, `@types/react`, and `@types/node`.

```bash
yarn add --dev dotenv ts-node typescript @types/react @types/node
```

4. Convert files from `.js` to `.ts`/`.tsx`.

5. Run server: `yarn dev`

6. Install Apollo, Prisma, Nexus.

```bash
yarn add apollo-server-micro \
apollo-boost @apollo/react-hooks @apollo/react-ssr apollo-link-schema apollo-link-state \
@prisma/client @nexus/schema nexus-prisma 

yarn add --dev @prisma/cli
```

7. Create Prisma configurations.

```bash
yarn prisma init
```

`prisma.env`:

```bash
DATABASE_URL="postgresql://master:rootpw@localhost:5432/develop?schema=public"
```

`prisma/schema.prisma`:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Post {
  id        Int      @default(autoincrement()) @id
  createdAt DateTime @default(now())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
}

model Profile {
  id     Int     @default(autoincrement()) @id
  bio    String?
  user   User    @relation(fields: [userId], references: [id])
  userId Int     @unique
}

model User {
  id      Int      @default(autoincrement()) @id
  email   String   @unique
  name    String?
  posts   Post[]
  profile Profile?
}
```

`prisma/seed.js`:

```js
const { PrismaClient } = require('@prisma/client')

const db = new PrismaClient()

main()

async function main() {
  await db.user.create({
    data: {
      name: 'Alice',
      email: 'alice@prisma.io',
      posts: {
        create: { title: 'Hello World' },
      },
      profile: {
        create: { bio: 'I like turtles' },
      },
    },
  })

  const allUsers = await db.user.findMany({
    include: {
      posts: true,
      profile: true,
    },
  })
  console.dir(allUsers, { depth: null })

  db.disconnect()
}
```

Run:

```bash
yarn prisma migrate save --experimental
yarn prisma migrate up --experimental
yarn prisma generate
node prisma/seed.js
```

8. Set Apollo API

`.env`:

```bash
NODE_ENV='development'
APOLLO_KEY=service:<your-service-name>:<hash-from-apollo-engine>
```

`pages/api/graphql.ts`:

```ts
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
```

`schema/index.ts`:

```ts
import { nexusPrismaPlugin } from 'nexus-prisma'
import { makeSchema } from '@nexus/schema'
import path from 'path'

import { Query } from './Query'
import { Mutation } from './Mutation'
import { User } from './User'
import { Profile } from './Profile'
import { Post } from './Post'

const PROJECT_DIRNAME: string =
  typeof process.env.PROJECT_DIRNAME !== 'undefined' ?
    process.env.PROJECT_DIRNAME : path.join(__dirname, '..')

export default makeSchema({
  types: [Query, Mutation, User, Profile, Post],
  plugins: [nexusPrismaPlugin()],
  outputs: {
    typegen: path.join(
      PROJECT_DIRNAME,
      'node_modules/@types/nexus-typegen/index.d.ts'
    ),
    schema: path.join(
      PROJECT_DIRNAME,
      'apollo/schema.graphql'
    ),
  },
  typegenAutoConfig: {
    contextType: 'Context.Context',
    sources: [
      {
        source: '.prisma/client',
        alias: 'prisma',
      },
      {
        source: require.resolve('./context'),
        alias: 'Context',
      },
    ],
  },
})
```

```ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface Context {
  prisma: PrismaClient
}

export const createContext = (): Context => ({ prisma })
```

Create `Query.ts`, `Mutation.ts`, `User.ts`, `Profile.ts`, `Post.ts`.

`tsconfig.prisma.json`:

```json
{
  "compilerOptions": {
    "esModuleInterop": true,
    "lib": [
      "esnext"
    ],
    "moduleResolution": "node",
    "noImplicitAny": true,
    "sourceMap": true,
    "strict": true,
    "skipLibCheck": true, // Skip Gulp Build Error
    "target": "es5"
  },
  "exclude": [
    "node_modules"
  ],
  "include": [
    "**/*.ts",
    "**/*.tsx"
  ]
}
```

`next.config.js`:

```js
module.exports = {
  env: {
    PROJECT_DIRNAME: __dirname,
  },
}
```

```bash
yarn prisma generate
yarn ts-node -r dotenv/config -P tsconfig.prisma.json -T schema
yarn dev
```

Open `localhost:3000/api/graphql`.

```gql
query {
  users {
    id
    email
    name
    posts {
      id
      title
      content
      published
      createdAt
    }
    profile {
      id
      bio
    }
  }
}
```

9. Build

```bash
yarn build

info  - Loaded env from .env
Creating an optimized production build  

Compiled successfully.

Automatically optimizing pages  

Page                                                           Size     First Load JS
┌ ○ /                                                          7.06 kB        65.8 kB
├ ○ /404                                                       3.25 kB          62 kB
├ λ /api/graphql
└ λ /api/hello
+ First Load JS shared by all                                  58.7 kB
  ├ static/pages/_app.js                                       983 B
  ├ chunks/fb0bd6d609c99ef199b7a0235a92f69e5ba7f3fa.0ddaec.js  10.7 kB
  ├ chunks/framework.c6faae.js                                 40 kB
  ├ runtime/main.bc6826.js                                     6.33 kB
  └ runtime/webpack.c21266.js                                  746 B

λ  (Server)  server-side renders at runtime (uses getInitialProps or getServerSideProps)
○  (Static)  automatically rendered as static HTML (uses no initial props)
●  (SSG)     automatically generated as static HTML + JSON (uses getStaticProps)

✨  Done in 6.15s.
```

10. Run server

```bash
yarn start
```

Open `http://localhost:3000/api/graphql?query={ users { id email name posts { id title content published createdAt } profile { id bio } } }`.

```json
{
  "data": {
    "users": [
      {
        "id": 1,
        "email": "alice@prisma.io",
        "name": "Alice",
        "posts": [
          {
            "id": 1,
            "title": "Hello World",
            "content": null,
            "published": false,
            "createdAt": "2020-05-03T11:54:05.344Z"
          }
        ],
        "profile": {
          "id": 1,
          "bio": "I like turtles"
        }
      }
    ]
  }
}
```

11. Apollo Client

```bash
yarn add @graphql-tools/load @graphql-tools/code-file-loader
```

`apollo/schema.js`:

```js
import { loadSchemaSync } from '@graphql-tools/load'
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader'

const schema = loadSchemaSync('apollo/schema.graphql',
{ loaders: [new GraphQLFileLoader()] })
```

`apollo/index.js`:

```js
import Head from 'next/head'
import { ApolloProvider } from '@apollo/react-hooks'
import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'

let globalApolloClient = null

/**
 * Creates and provides the apolloContext
 * to a next.js PageTree. Use it by wrapping
 * your PageComponent via HOC pattern.
 * @param {Function|Class} PageComponent
 * @param {Object} [config]
 * @param {Boolean} [config.ssr=true]
 */
export function withApollo(PageComponent, { ssr = true } = {}) {
  const WithApollo = ({ apolloClient, apolloState, ...pageProps }) => {
    const client = apolloClient || initApolloClient(undefined, apolloState)
    return (
      <ApolloProvider client= { client } >
      <PageComponent { ...pageProps } />
      </ApolloProvider>
    )
}

// Set the correct displayName in development
if (process.env.NODE_ENV !== 'production') {
  const displayName =
    PageComponent.displayName || PageComponent.name || 'Component'

  if (displayName === 'App') {
    console.warn('This withApollo HOC only works with PageComponents.')
  }

  WithApollo.displayName = `withApollo(${displayName})`
}

if (ssr || PageComponent.getInitialProps) {
  WithApollo.getInitialProps = async (ctx) => {
    const { AppTree } = ctx

    // Initialize ApolloClient, add it to the ctx object so
    // we can use it in `PageComponent.getInitialProp`.
    const apolloClient = (ctx.apolloClient = initApolloClient({
      res: ctx.res,
      req: ctx.req,
    }))

    // Run wrapped getInitialProps methods
    let pageProps = {}
    if (PageComponent.getInitialProps) {
      pageProps = await PageComponent.getInitialProps(ctx)
    }

    // Only on the server:
    if (typeof window === 'undefined') {
      // When redirecting, the response is finished.
      // No point in continuing to render
      if (ctx.res && ctx.res.finished) {
        return pageProps
      }

      // Only if ssr is enabled
      if (ssr) {
        try {
          // Run all GraphQL queries
          const { getDataFromTree } = await import('@apollo/react-ssr')
          await getDataFromTree(
            <AppTree
                pageProps={{
            ...pageProps,
            apolloClient,
          }}
              />
            )
      } catch (error) {
        // Prevent Apollo Client GraphQL errors from crashing SSR.
        // Handle them in components via the data.error prop:
        // https://www.apollographql.com/docs/react/api/react-apollo.html#graphql-query-data-error
        console.error('Error while running `getDataFromTree`', error)
      }

      // getDataFromTree does not call componentWillUnmount
      // head side effect therefore need to be cleared manually
      Head.rewind()
    }
  }

  // Extract query data from the Apollo store
  const apolloState = apolloClient.cache.extract()

  return {
    ...pageProps,
    apolloState,
  }
}
  }

return WithApollo
}

/**
 * Always creates a new apollo client on the server
 * Creates or reuses apollo client in the browser.
 * @param  {Object} initialState
 */
function initApolloClient(ctx, initialState) {
  // Make sure to create a new client for every server-side request so that data
  // isn't shared between connections (which would be bad)
  if (typeof window === 'undefined') {
    return createApolloClient(ctx, initialState)
  }

  // Reuse client on the client-side
  if (!globalApolloClient) {
    globalApolloClient = createApolloClient(ctx, initialState)
  }

  return globalApolloClient
}

/**
 * Creates and configures the ApolloClient
 * @param  {Object} [initialState={}]
 */
function createApolloClient(ctx = {}, initialState = {}) {
  const ssrMode = typeof window === 'undefined'
  const cache = new InMemoryCache().restore(initialState)

  // Check out https://github.com/zeit/next.js/pull/4611 if you want to use the AWSAppSyncClient
  return new ApolloClient({
    ssrMode,
    link: createIsomorphLink(ctx),
    cache,
  })
}

function createIsomorphLink(ctx) {
  if (typeof window === 'undefined') {
    const { SchemaLink } = require('apollo-link-schema')
    const { schema } = require('./schema')
    return new SchemaLink({ schema, context: ctx })
  } else {
    const { HttpLink } = require('apollo-link-http')

    return new HttpLink({
      uri: '/api/graphql',
      credentials: 'same-origin',
    })
  }
}
```

```bash
yarn dev
```

12.  Page

```tsx
import { withApollo } from '../apollo'
import gql from 'graphql-tag'
import { useQuery } from '@apollo/react-hooks'

const UserQuery = gql`
  query USER {
    users {
      id
      email
      name
      posts {
        id
        title
        published
      }
    }
  }
`

const Users = () => {
  const { loading, error, data } = useQuery(UserQuery, { ssr: false })

  if (loading) return <p>Loading...</p>
  if (error) return <p>Error :(</p>

  return data.users.map((result: any) => {
    const { id, email, name, posts } = result
    return (
      <div key={id}>
        <p>
          {name} ({email})
        </p>
        {posts.map((result: any) => {
          const { id, title, published } = result
          return (
            <p key={id}>
              Post: "{title}" is {published ? 'published' : 'not published'}.
            </p>
          )
        })}
      </div>
    )
  })
}

const App = (): JSX.Element => (
  <div>
    <h2>
      Apollo & Prisma
      <span role="img" aria-label="rocket">
        🚀
      </span>
    </h2>
    <Users />
  </div>
)

export default withApollo(App)
```

13. Finished

```text
Apollo & Prisma🚀

Alice (alice@prisma.io)

Post: "Hello World" is published.
```

14. Build

```bash
yarn build
```

```bash
info  - Loaded env from .env
Creating an optimized production build  

Compiled successfully.

Automatically optimizing pages  

Page                                                           Size     First Load JS
┌ λ /                                                          43.5 kB         108 kB
├ ○ /404                                                       2.55 kB        67.3 kB
├ λ /api/graphql
└ λ /api/hello
+ First Load JS shared by all                                  64.7 kB
  ├ static/pages/_app.js                                       986 B
  ├ chunks/0d5ed275e736a30768c53cda44fb8ad2e119bbd3.478112.js  8.17 kB
  ├ chunks/commons.8e9962.js                                   3.14 kB
  ├ chunks/framework.7117c8.js                                 44.9 kB
  ├ runtime/main.96ec2d.js                                     6.29 kB
  └ runtime/webpack.ab3d41.js                                  1.21 kB

λ  (Server)  server-side renders at runtime (uses getInitialProps or getServerSideProps)
○  (Static)  automatically rendered as static HTML (uses no initial props)
●  (SSG)     automatically generated as static HTML + JSON (uses getStaticProps)

✨  Done in 6.34s.
```

15. Start

```bash
yarn start
```

```bash
ready - started server on http://localhost:3000
```
