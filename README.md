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