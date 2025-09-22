export default function Hello({ name = "world" }) {
  return <h2 style={{ marginTop: 24 }}>Hello, {name}!</h2>;
}