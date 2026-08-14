const r=require('express').Router(),c=require('../controllers/staff.controller');
r.get('/',c.list);r.post('/',c.create);r.patch('/:id',c.update);r.post('/assignments',c.assign);module.exports=r;
