import expect from 'expect.js';

import Backbone from 'backbone';
import Radio from 'backbone.radio';

import jquery from 'jquery';

import {UserModel, authSync} from '../../app/base/models/auth';


describe('UserModel', function() {
  var model;

  beforeEach(function() {
    model = new UserModel();

    sinon.spy(model, 'trigger');
    sinon.spy(model, 'sync');
  });

  afterEach(function() {
    model.clear();
    model.trigger.restore();
    model.sync.restore();
  });

  it('marks the user as not logged in when token is empty', () => {
    expect(model.isLoggedIn()).to.equal(false);
  });

  it('marks the user as logged in when token is set', () => {
    model.save({token: 'abc'});
    expect(model.isLoggedIn()).to.equal(true);
  });

  it('can log users out', () => {
    model.save({token: 'abc'});

    model.logout();

    expect(model.trigger.calledWith('logout')).to.equal(true);
    expect(model.isLoggedIn()).to.equal(false);

    const storedUser = JSON.parse(
      global.localStorage.getItem('UserModel-current'));
    expect(storedUser.token).to.equal('');
  });

  it('can update the user', () => {
    model.updateUser({
      first_name: 'Test',
      last_name: 'User'
    });

    expect(model.get('first_name'), 'Test');
    expect(model.get('last_name'), 'User');

    const syncArgs = model.sync.getCall(1).args;

    expect(syncArgs[0]).to.equal('update');
    expect(syncArgs[1]).to.equal(model);
    expect(syncArgs[2].ajaxSync).to.equal(true);
  });

  it('parses the querystring to set the fit_token', function() {
    const code = '?code=abcdef';
    model.updateFitToken(code);

    expect(model.get('fit_token')).to.equal('abcdef');

    const syncArgs = model.sync.getCall(0).args;

    expect(syncArgs[0]).to.equal('update');
    expect(syncArgs[1]).to.equal(model);
    expect(syncArgs[2].ajaxSync).to.equal(true);
  });

  it('parses undefined and does nothing', function() {
    model.set('fit_token', 'abcdef');
    model.updateFitToken();

    expect(model.get('fit_token')).to.equal('abcdef');
  });
});

describe('Auth Sync proxy', () => {
  const authChannel = Radio.channel('auth');
  const AuthModel = Backbone.Model.extend({
    url: '/something',
    sync: authSync
  });
  let model;
  let server;

  beforeEach((done) => {
    sinon.stub(authChannel, 'trigger');
    sinon.spy(Backbone, 'sync');
    sinon.stub(jquery, 'ajax');

    model = new AuthModel();
    const user = new UserModel();
    user.save({
      token: 'abc',
      first_name: 'test',
      last_name: 'user',
      email: 'test@example.com'
    });

    server = sinon.fakeServer.create();

    done();
  });

  afterEach((done) => {
    authChannel.trigger.restore();
    Backbone.sync.restore();
    jquery.ajax.restore();

    model = null;
    const user = new UserModel();

    user.destroy();
    server.restore();

    done();
  });

  it('triggers unauthorised when login fails', (done) => {
    model.once('token:get', function() {
      expect(jquery.ajax.calledOnce).to.equal(true);
      const args = {status: 401};
      jquery.ajax.firstCall.args[0].error(args);

      expect(
        authChannel.trigger.calledWith('token:invalid', model)
      ).to.equal(true);
      done();
    });

    model.fetch({ajaxSync: true});
  });

  it('only triggers on 401', (done) => {
    model.once('token:get', function() {
      expect(jquery.ajax.calledOnce).to.equal(true);
      const args = {status: 400};
      jquery.ajax.firstCall.args[0].error(args);

      expect(
        authChannel.trigger.calledWith('token:invalid', model)
      ).to.equal(false);
      done();
    });

    model.fetch({ajaxSync: true});
  });
});

describe('Invalid token', () => {
  beforeEach((done) => {
    global.localStorage.setItem('key', 'value');
    done();
  });

  it('does not remove localStorage data', (done) => {
    const authChannel = Radio.channel('auth');
    authChannel.trigger('token:invalid');

    const keyValue = global.localStorage.getItem('key');
    expect(keyValue).to.not.equal(null);

    done();
  });
});

describe('User password', () => {
  let user;

  beforeEach((done) => {
    user = new UserModel();
    sinon.stub(user, 'sync');
    done();
  });

  afterEach((done) => {
    user.sync.restore();
    done();
  });

  it('can update the user\'s password', (done) => {
    user.changePassword('newpassword', 'newpassword');

    expect(user.isValid()).to.equal(true);
    expect(user.sync.calledWith('patch')).to.equal(true);

    done();
  });

  it('will not update if the passwords do not match', (done) => {
    user.changePassword('newpassword', 'differentpassword');

    expect(user.sync.calledWith('patch')).to.equal(false);

    done();

  });
});
