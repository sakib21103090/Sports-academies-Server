const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const stripe = require('stripe')(process.env.SECRET_KEY_PAYMENT)
// console.log(stripe)
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

require('dotenv').config()

const app= express();
const port =process.PORT || 5000;

// middleware
app.use(cors());
app.use (express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_JWT, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}



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
    const instructorCollection = client.db("Sports").collection("instructor");
    const cartsCollection = client.db("Sports").collection("carts");


    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_JWT, { expiresIn: '1h' })
      res.send({ token })
    })


    // cats collection
    app.get('/carts', async (req, res) => {
      const email = req.query.email;

      if (!email) {
        res.send([]);
      }
      const query = { email: email };
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/carts', async (req, res) => {
      const Class = req.body;
      const result = await cartsCollection.insertOne(Class);
      res.send(result);
    })

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    })

    //  class information api
    app.get("/classes", async (req, res) => {
      const classes = await classesCollection.find({}).sort({availableSeats :-1}).toArray();
        // .sort({ createdAt: -1 })
        
      res.send(classes);
    });
    app.get("/instructors", async (req, res) => {
      const classes = await instructorCollection.find({}).toArray();
        // .sort({ createdAt: -1 })
        
      res.send(classes);
    });
    app.get("/class", async (req, res) => {
      const c = await classesCollection.find({}).limit(6).sort({availableSeats :-1}).toArray();
        // .sort({ createdAt: -1 })
        
      res.send(c);
    });
    app.get("/instructor", async (req, res) => {
      const c = await classesCollection.find({}).limit(6).toArray();
        // .sort({ createdAt: -1 })
        
      res.send(c);
    });

// add class
app.post("/addClass", async (req, res) => {
  const body = req.body;
  const result = await classesCollection.insertOne(body);
 
  res.send(result);
});

// My Add class instructor
app.get("/myClass/:email", async (req, res) => {
  const cls = await classesCollection
    .find({
      instructorEmail: req.params.email,}).sort({price :1}).toArray();
  res.send(cls);
});


// delete user
app.delete('/users/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await usersCollection.deleteOne(query);
  res.send(result);
})
// users Apis
    app.get('/users', verifyJWT,async (req, res) => {
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
     
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
       return res.send({ admin: false })
      }

      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })


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

    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        return  res.send({ instructor: false })
      }

      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === 'instructor' }
        res.send(result);
    })


    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);

    })

    // // create payment intent
    // app.post('/create-payment-intent', verifyJWT, async (req, res) => {
    //   const { price } = req.body;
    //   const amount = parseInt(price * 100);
    //   const paymentIntent = await stripe.paymentIntents.create({
    //     amount: amount,
    //     currency: 'usd',
    //     payment_method_types: ['card']
    //   });

    //  return res.send({
    //     clientSecret: paymentIntent.client_secret
    //   })
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