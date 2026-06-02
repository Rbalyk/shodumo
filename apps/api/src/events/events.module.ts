import { Module } from '@nestjs/common';
import { OrganizersModule } from '../organizers/organizers.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [OrganizersModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
