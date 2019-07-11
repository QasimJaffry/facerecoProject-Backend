const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');
const application = express();
const Clarifai = require('clarifai');

 const app = new Clarifai.App({
    apiKey: '6df216c30eb847d79aa23e7873a322ae'
  });


const pg = knex({
  client: 'pg',
  connection: {
    host : '127.0.0.1',
    user : 'postgres',
    password : 'ronaldo9',
    database : 'facedetect'
  }
});

application.use(bodyParser.json());
application.use(cors());

application.get('/', (req,res)=>{
	res.json("working");
})

application.post('/signin', (req,res)=>{
	if(!req.body.email || !req.body.password){
		return res.status(400).json('incorrect');
	}
	pg.select('email', 'hash').from('login')
	.where('email', '=', req.body.email)
	.then(data => {
		const valid = bcrypt.compareSync(req.body.password,data[0].hash)
		if(valid){
			return pg.select('*').from('users')
			.where('email', '=', req.body.email)
			.then(user => {
				res.json(user[0])
			})
			.catch(err => res.status(400).json("unable to get user"))
		}else{
		res.status(400).json("wrong")
		}
	})
	.catch(err => res.status(400).json("wrong credentials"))
})


application.post('/register', (req,res)=>{
	const {email,name,password} = req.body;
	if(!email || !name || !password){
		return res.status(400).json('incorrect');
	}
	const hash = bcrypt.hashSync(password);
	pg.transaction(trx => {
		trx.insert({
			hash: hash,
			email: email
		})
		.into('login')
		.returning('email')
		.then(loginEmail => {
			return trx('users')
			.returning('*')
			.insert({
				email : loginEmail[0],
				name : name,
				joined : new Date()
		})
			.then(user => {
			res.json(user[0]);
	})	
			.then(trx.commit)
			.catch(trx.rollback)
})
}).catch(err => res.status(400).json('unable to join'))
	
})
application.put('/image',(req,res)=>{
	const { id } = req.body;
	pg('users').where('id', '=', id)
	.increment('entries', 1)
	.returning('entries')
	.then(entries => {
		res.json(entries[0]);
	})
	.catch(err => res.status(400).json('unable to get'));
})
application.post('/imageurl',(req,res)=>{
	app.models
      .predict(
        Clarifai.FACE_DETECT_MODEL,
        req.body.input)
      .then(data => {
      	res.json(data);
      })
      .catch(err => res.status(400).json("Error "));
})
application.get('/profile/:id', (req, res) => {
	const { id } = req.params;
	
	pg.select('*').from('users').where({
		id : id
	}).then(user => {
		if(user.length){
			res.json(user[0]);
		}else{
			res.status(400).json("Not found")
		}
	}).catch(err => res.status(400).json("Not found"))
	
})
application.listen(process.env.PORT || 3001,() => {
	console.log("Working");
})




