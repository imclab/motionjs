var motion = require(__dirname + '/../lib/motion.js').motion,
    vows   = require('vows'),
    assert = require('assert');

vows.describe('Motion.js').addBatch({
  // Motion Sanity
  'When creating a motion object' : {
    topic : function() {
      return motion();
    },
    "call sites are sane" : function(err, obj) {
      assert.isNumber(motion.SERVER);
      assert.isNumber(motion.CLIENT);
      assert.isNumber(motion.OBSERVER);
      assert.isFunction(obj.on);
      assert.isFunction(obj.emit);
      assert.isFunction(obj.removeListener);
      assert.isFunction(obj.removeAllListeners);
    }
  },
  'When emitting events': {
    topic : function() {
      var m = motion();
      m.on('test', this.callback)
       .emit('test', null,  { test : 'data'}, 'arbitrary');
    }, 'on/emit work as expected' : function(err, data, more) {
      assert.equal(data.test, 'data');
      assert.equal(more, 'arbitrary');
    }
  }
}).addBatch({
  // Shared networking
  'When a message is build with netMsg' : {
    topic : function() {
      var m = motion(motion.CLIENT, { debug : true });
      // 'sync' is a known-to-be-valid netMsg type
      return { m : m, msg : m.netMsg('sync', 'data') };
    },
    'the message should be valid' : function(err, data) {
      assert.equal(data.msg.type, 'motion');
      assert.equal(data.msg.motionType, 'sync');
      assert.equal(data.msg.sync, 'data');
      assert.isTrue(data.m.handle(data.msg));
    }
  },
  'When an invalid message is built with netMsg' : {
    topic : function() {
      var m = motion(motion.CLIENT, { debug : true });
      // 'tick' is a known-to-be-valid netMsg type
      return { m : m, msg : m.netMsg('non-existant-type', 'data') };
    },
    'motion.handle(netMsg) should return false' : function(err, data) {
      // this allows for 
      assert.isFalse(data.m.handle(data.msg));
    }
  }
}).addBatch({
  // Client Behavior
  'When a controller is updated' : {
    topic : function() {
      var m = motion(motion.CLIENT, {
            debug    : true,
            syncRate : 100
          }),
          c = m.controller('dummy', 10),
          cb = this.callback;
      m.ticker.start();
      
      // Simulate movement
      c.set({ 'up' : 0 });
      
      setTimeout(function() {
        c.set({ 'up' : 100});
      }, 40);

      m.on('sync', function(msg) {
        m.ticker.stop();
        cb(null, msg);
      });
    },
    'the updates should be pushed out in a group' : function(err, msg) {
      assert.isTrue(msg.actions.dummy.length >= 10);
    }
  }
}).addBatch({
  // Server Behavior
  'When a server is running' : {
    topic : function() {
      var s     = motion(motion.SERVER, { syncRate : 50 }),
          start = (new Date()).getTime(),
          cb    = this.callback,
          msgs  = [];

      s.ticker.start();
      s.on('sync', function(msg) {
        msgs.push(msg);
      });
      
      setTimeout(function() {
        s.ticker.stop();
        cb(null, { start: start, msgs : msgs });
      }, 1000);
    },
    'snapshots are taken on an interval' : function(err, data) {
      assert.isTrue(data.msgs.length >= 19);
      assert.isTrue(data.msgs.length <= 21);
    }
  }
}).addBatch({
  // Scene Management
  'When an plain old object is wrapped by motion' : {
    topic : function() {
      var m = motion(motion.CLIENT, { debug: true }),
          scene = {
            ball : {
              x : 100,
              y : 200
            }
          },
          mScene = m.scene(scene),
          cb = this.callback;
      
      b = mScene.wrap('ball', scene.ball, function validate(k, v) { return true; });

      // move the ball 10 units on the x axis
      mScene.obj('ball').set('x', 110);

      // move the ball to 0 on the y axis (200 units)
      b.set('y', 0);

      m.on('snapshot', function(snapshot) {
        cb(null, { scene : mScene, snapshot: snapshot});
        m.ticker.stop();
      });

      m.ticker.start();
    },
    'changes in the scene should be reflected in the snapshot' : function(err, obj)
    {
      // Because this motion instance is in debug mode, we can inspect the delta cache
      assert.equal(obj.snapshot.deltas.ball.x, 10);
      assert.equal(obj.snapshot.deltas.ball.y, -200);

    }
  }
})/*.addBatch({
  // Communication testing
  ''
}*/.export(module);
