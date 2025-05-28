import { TestBed } from '@angular/core/testing';

import { DeployStatusService } from './deploy-status.service';

describe('DeployStatusService', () => {
  let service: DeployStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeployStatusService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
