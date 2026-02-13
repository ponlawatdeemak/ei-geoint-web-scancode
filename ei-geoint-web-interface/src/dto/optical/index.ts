import { IsNotEmpty, IsString } from 'class-validator'

export class ExampleOpticalDtoIn {
  @IsString()
  @IsNotEmpty()
  value: string
}
