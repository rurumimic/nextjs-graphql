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