-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "nameEn" TEXT;

-- AlterTable
ALTER TABLE "City" ADD COLUMN     "nameEn" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "descriptionEn" TEXT,
ADD COLUMN     "titleEn" TEXT;

-- AlterTable
ALTER TABLE "Organizer" ADD COLUMN     "bioEn" TEXT;
