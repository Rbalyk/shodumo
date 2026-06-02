import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { CitiesModule } from '../cities/cities.module';
import { EventsModule } from '../events/events.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [EventsModule, CitiesModule, CategoriesModule],
  controllers: [AdminController],
})
export class AdminModule {}
