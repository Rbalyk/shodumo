import { Module } from '@nestjs/common';
import { OrganizersModule } from '../organizers/organizers.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [OrganizersModule],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}
