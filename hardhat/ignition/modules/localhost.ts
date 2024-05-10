import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const EventEmitterModule = buildModule('EventEmitterModule', (m) => {
  const eventEmitter = m.contract('ExampleEventEmitter', []);

  m.call(eventEmitter, 'emitSimpleDataEvent');
  m.call(eventEmitter, 'emitStructDataEvent');

  return { eventEmitter };
});

export default EventEmitterModule;
