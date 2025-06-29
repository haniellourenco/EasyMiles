import { TestBed } from '@angular/core/testing';

import { LoyaltyProgramService } from './loyalty-program.service';

describe('LoyaltyProgramService', () => {
  let service: LoyaltyProgramService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoyaltyProgramService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
