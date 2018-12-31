import React from 'react'
import ReactDOM from 'react-dom'
import Playground from './pages/playground'


const setup = async () => {
    const {db} = await require('./setup')('postgres')
    return db
}

console.log("meow")
function App () {
    return (<div>
        
        <Playground setup={setup}/>
        
        
        </div>)

}

const Container = document.getElementById("App")

ReactDOM.render(<App />, Container)