const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

const app= express();
const port =process.PORT || 5000;

// middleware
app.use(cors());
app.use (express.json());





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.as0dvvq.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();

    const usersCollection = client.db("Sports").collection("users");
    const classesCollection = client.db("Sports").collection("classes");


    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_JWT, { expiresIn: '1h' })
      res.send({ token })
    })

    //  class information api
    app.get("/classes", async (req, res) => {
      const classes = await classesCollection.find({}).sort({availableSeats :-1}).toArray();
        // .sort({ createdAt: -1 })
        
      res.send(classes);
    });
    app.get("/class", async (req, res) => {
      const c = await classesCollection.find({}).limit(6).sort({availableSeats :-1}).toArray();
        // .sort({ createdAt: -1 })
        
      res.send(c);
    });



// users Apis
    app.get('/users',async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: 'already exists' })
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });


    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);

    })

    // app.patch('/users/instructor/:id', async (req, res) => {
    //   const id = req.params.id;
    //   console.log(id);
    //   const filter = { _id: new ObjectId(id) };
    //   const updateDoc = {
    //     $set: {
    //       role: 'instructor'
    //     },
    //   };

    //   const result = await usersCollection.updateOne(filter, updateDoc);
    //   res.send(result);

    // })
  }
}
run().catch(console.dir);



app.get ('/',(req,res)=>{
    res.send('Sport Academy is running ')
})

app.listen(port,()=>{
    console.log(`Sport Academy is running on port ${port}`)
})