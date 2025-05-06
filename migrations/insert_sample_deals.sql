-- Insert sample deals from the screenshot
INSERT INTO sales_deals (
    deal_number, name, client_name, owner_name, 
    value, deal_type, deal_stage, priority, is_active,
    vertical
) VALUES
    -- Row 1: B05564_FL_Hillsborough County_ICT
    ('B05564_FL', 'Hillsborough County_ICT', 'Sam Shaw', 'Sam Shaw', 
     450000, 'unsolicited_bid', 'verbal_commit', 'urgent', true,
     'Fast'),

    -- Row 2: B05546_FL_Pinellas County_ICT
    ('B05546_FL', 'Pinellas County_ICT', 'Sam Shaw', 'Sam Shaw', 
     466306.60, 'unsolicited_bid', 'verbal_commit', 'medium', true,
     'Fast'),

    -- Row 3: B05537_FL_Patrick AFB_BAF_SPHEL
    ('B05537_FL', 'Patrick AFB_BAF_SPHEL', 'Henry Holiday', 'Henry Holiday', 
     213200, 'unsolicited_bid', 'verbal_commit', 'high', true,
     'DoD'),

    -- Row 4: B05132-01_CA_China Lake AFB_C7134_MODIFICATION
    ('B05132-01', 'CA_China Lake AFB_C7134_MODIFICATION', 'Henry Holiday', 'Henry Holiday', 
     194831, 'developed_direct', 'submit_decide', 'high', true,
     'DoD'),

    -- Row 5: B05139-01_CA_Edwards AFB_BAF_MODIFICATION
    ('B05139-01', 'CA_Edwards AFB_BAF_MODIFICATION', 'Chris Peak', 'Chris Peak', 
     81000, 'developed_direct', 'verbal_commit', 'high', true,
     'DoD'),

    -- Row 6: B05268-01_MT_Lewis&Clark/PublicHealth_Retrofit_MODIFICATION
    ('B05268-01', 'MT_Lewis&Clark/PublicHealth_Retrofit_MODIFICATION', 'Robert Kotz', 'Robert Kotz', 
     12942.50, 'developed_direct', 'site_core_activity', 'medium', true,
     'Services'),

    -- Row 7: B03956-01_GA_GTRI_016_01_Refresh
    ('B03956-01', 'GA_GTRI_016_01_Refresh', 'Tyler Evans', 'Tyler Evans', 
     60601, 'developed_direct', 'verbal_commit', 'medium', true,
     'Services'),

    -- Row 8: B05110-01_GA_GTRI_020_01
    ('B05110-01', 'GA_GTRI_020_01', 'Henry Holiday', 'Henry Holiday', 
     990643, 'developed_direct', 'verbal_commit', 'high', true,
     'DoD'),

    -- Row 9: B05121_OK_Gaspipe Nation Marshall Service_ICT2351
    ('B05121_OK', 'Gaspipe Nation Marshall Service_ICT2351', 'Monty Oadon', 'Monty Oadon', 
     1618415.91, 'unfinanced_restrict', 'project_launch', 'medium', true,
     'West'),

    -- Row 10: B05440_FL_Eglin AFB_CST DRV
    ('B05440_FL', 'Eglin AFB_CST DRV', 'Henry Holiday', 'Henry Holiday', 
     687073.30, 'unsolicited_bid', 'project_launch', 'high', true,
     'DoD'),

    -- Row 11: B05581_FL_Eglin AFB_CST_DRV
    ('B05581_FL', 'Eglin AFB_CST_DRV', 'Henry Holiday', 'Henry Holiday', 
     2251834.11, 'unfinanced_restrict', 'project_launch', 'high', true,
     'DoD'),

    -- Row 12: B05436_AZ_Navajo Dive Response Vehicle
    ('B05436_AZ', 'Navajo Dive Response Vehicle', 'Monty Oadon', 'Monty Oadon', 
     1715083, 'developed_direct', 'project_launch', 'medium', true,
     'West'),

    -- Row 13: B05257_FL_VMAC_1C344a0
    ('B05257_FL', 'VMAC_1C344a0', 'Cienna Herbst', 'Cienna Herbst', 
     1701878.1, 'unsolicited_bid', 'project_launch', 'medium', true,
     'FedCiv'),

    -- Row 14: B05615_INT_Mexico_Polastic_CNL_TCV
    ('B05615_INT', 'Mexico_Polastic_CNL_TCV', 'Dylan Ruggles', 'Dylan Ruggles', 
     8800000, 'developed_public_bid', 'verbal_commit', 'medium', true,
     'House'),

    -- Row 15: B05137_CA_Southern California Edison_TCT-F1D
    ('B05137_CA', 'Southern California Edison_TCT-F1D', 'Michael Johnson', 'Monty Oadon', 
     1705083, 'developed_direct', 'not_started', 'medium', true,
     'West');