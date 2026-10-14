> **When to use this file:** Use this file when you encounter an MPW-xxxx error code in a Deposit Response file and need to understand what it means, or when building error handling for deposit operations.

These codes appear in the Replies tag of response files. See [../schemas/deposit-response.md](../schemas/deposit-response.md) for the Replies tag structure.

# Deposit Message Codes (MPW-xxxx)

> **Note:** This table of message codes may evolve over time. At all times, an up-to-date message code table can be downloaded on the e-MassPost website, in the tab "Informations" of the menu "Files".

| Code | Severity | Description |
|------|----------|-------------|
| MPW-0000 | INFO | Success |
| MPW-0001 | FATAL | Password successfully changed |
| MPW-0002 | FATAL | user object is expired |
| MPW-0003 | FATAL | duplicate object |
| MPW-0004 | FATAL | object not found |
| MPW-0005 | FATAL | Unable to delete object. Object is referenced. |
| MPW-0006 | FATAL | Invalid request. The id format is incorrect. |
| MPW-0007 | FATAL | Invalid state of struts synchronization token. |
| MPW-1000 | FATAL | User not found |
| MPW-1001 | FATAL | geen native user voor deze routeur |
| MPW-1002 | FATAL | Unable to build menu for the current user |
| MPW-1003 | FATAL | No web roles found |
| MPW-1004 | FATAL | help not found |
| MPW-1005 | FATAL | User s have to be of the same type (normal/intermediate) |
| MPW-1006 | FATAL | Native user may not be changed |
| MPW-1008 | FATAL | only intermediate users may perform this action |
| MPW-1009 | FATAL | Deposit not found |
| MPW-1010 | FATAL | Product group already exists |
| MPW-1011 | FATAL | Package with the current name already exists |
| MPW-1013 | FATAL | native intermediate admin of the routeur not found |
| MPW-1014 | FATAL | only administrators may perform this action |
| MPW-1015 | FATAL | only normal users may perform this action |
| MPW-1016 | FATAL | Annex not found |
| MPW-1017 | FATAL | pbc_num not found |
| MPW-1018 | FATAL | invoice grouping already exists |
| MPW-1019 | FATAL | User already exists |
| MPW-1020 | FATAL | Models not found for current user |
| MPW-1021 | FATAL | no webcounter destination center could be fond |
| MPW-1022 | FATAL | the given model was not found |
| MPW-1023 | FATAL | model allready exists |
| MPW-1024 | FATAL | module allready exists |
| MPW-1025 | FATAL | item allready exists for this module |
| MPW-1026 | FATAL | dyna table is empty |
| MPW-1028 | FATAL | metering prijzen mogen niet leeg gelaten worden |
| MPW-1029 | FATAL | delivery date can not be empty |
| MPW-1030 | FATAL | no modifyable deposits found |
| MPW-1031 | FATAL | modelname cannot be empty |
| MPW-1032 | FATAL | PBC with the given name already exists |
| MPW-1033 | FATAL | Given PBC number not found |
| MPW-1034 | FATAL | intermediate native user may only be filled out for routeurs |
| MPW-1035 | FATAL | Wrong data table passed |
| MPW-1036 | FATAL | Only native users may be created using this function |
| MPW-1037 | FATAL | No clients found |
| MPW-1038 | FATAL | No Products found |
| MPW-1039 | FATAL | No Postal Business constracts found |
| MPW-1040 | FATAL | administrtors not filled in |
| MPW-1041 | FATAL | Administartor and intermediate administrator have to be different persons |
| MPW-1042 | FATAL | No routeurs found |
| MPW-1043 | FATAL | deposit date is a non working day |
| MPW-1044 | FATAL | Convention nr niet gevonden |
| MPW-1045 | FATAL | Invoice niet gevonden |
| MPW-1046 | FATAL | PRS niet gevonden |
| MPW-1047 | FATAL | Convention reeds toegevoegd |
| MPW-1048 | FATAL | Invoice reeds toegevoegd |
| MPW-1049 | FATAL | Niet in staat de barcode samen te stellen |
| MPW-1050 | FATAL | No invoice Clients found |
| MPW-1051 | FATAL | Model Not found for the user |
| MPW-1052 | FATAL | No PBC users found |
| MPW-1053 | FATAL | A Postal Business Contract has to be chosen |
| MPW-1054 | FATAL | Report <p1> not handled by the program logic |
| MPW-1055 | FATAL | user may not view autorisation report or report does not exist |
| MPW-1056 | FATAL | user may not view summary report or report does not exist |
| MPW-1059 | FATAL | No deposit places found |
| MPW-1060 | FATAL | No conventions found |
| MPW-1061 | FATAL | The user has not the necessary rights. |
| MPW-1062 | FATAL | Invoice client of pbc already exists |
| MPW-1080 | FATAL | Translations saved successfull |
| MPW-1081 | FATAL | No changes to save |
| MPW-1090 | FATAL | Client with given PRS number not found |
| MPW-1091 | FATAL | Error using the PRS service |
| MPW-1096 | FATAL | Only one weight range allowed for deposit with same format and weight range |
| MPW-1097 | FATAL | Dummy conventions may not be used |
| MPW-1098 | FATAL | No product-rights defined |
| MPW-1099 | FATAL | Maximum number of pieces is 9.999.999 |
| MPW-1100 | FATAL | Field is mandatory |
| MPW-1101 | FATAL | Field has minimum length |
| MPW-1102 | FATAL | Passwords to not match |
| MPW-1103 | FATAL | Please specify a date format (<p1>) for field <p2> |
| MPW-1104 | FATAL | Reference is required field |
| MPW-1105 | FATAL | Machine nr is required field |
| MPW-1106 | FATAL | Fields <p1> must be different for the 2 users |
| MPW-1107 | FATAL | Account may not correct format |
| MPW-1108 | FATAL | max value for weights : 99999999999 |
| MPW-1109 | FATAL | incorrect deciaml value for weights |
| MPW-1110 | FATAL | no decimal numbers allowed for quantity |
| MPW-1111 | FATAL | Setup Error, no webcounters defined |
| MPW-1112 | FATAL | This date does not exist |
| MPW-1113 | FATAL | Incorrect timeformat for <p1> [hh:mm] |
| MPW-1114 | FATAL | This time does not exist: <p1> |
| MPW-1117 | FATAL | No single (unique) annex combination could be found. |
| MPW-1120 | FATAL | concurrent access validation |
| MPW-1177 | FATAL | incorrect deciaml value for metering prices |
| MPW-1178 | FATAL | max value for metering prices : 999999999 |
| MPW-1189 | FATAL | concurrent access modify |
| MPW-1190 | FATAL | model name all ready exist |
| MPW-1191 | FATAL | deposit date expired |
| MPW-1313 | FATAL | user has no access to the function |
| MPW-1330 | FATAL | product van composition heeft prijs lager dan minimum prijs, <p1>=gewicht, <p2>=minimum prijs |
| MPW-2000 | FATAL | Dup value Deposit centre |
| MPW-2001 | FATAL | Dup value Nature types |
| MPW-2002 | FATAL | Dup value Metering types |
| MPW-2003 | FATAL | Dup value sort types |
| MPW-2004 | FATAL | Dup value payment types |
| MPW-2005 | FATAL | Dup value convention types |
| MPW-2006 | FATAL | Dup value flexibilities |
| MPW-2007 | FATAL | Dup value destination types |
| MPW-2008 | FATAL | Dup value product types |
| MPW-2009 | FATAL | MD Char dup value |
| MPW-2010 | FATAL | MD Product dup value |
| MPW-2011 | FATAL | Dup value MD periodicities |
| MPW-2012 | FATAL | Dup value sales |
| MPW-2013 | FATAL | Passed annex not found in the database |
| MPW-2014 | FATAL | Dup value destination centre |
| MPW-2015 | FATAL | Dup value quality types |
| MPW-2016 | FATAL | Dup value adresses |
| MPW-2017 | FATAL | Could not convert timestamp |
| MPW-2018 | FATAL | Could not convert number |
| MPW-2019 | FATAL | Passed Convention no found in the database |
| MPW-2020 | FATAL | Convention with the same number already exists |
| MPW-2021 | FATAL | No linked annex found |
| MPW-2022 | FATAL | Annex with the same name already exists |
| MPW-2023 | FATAL | Passed weight range is not defined in the database |
| MPW-2024 | FATAL | Option price already exists |
| MPW-2052 | FATAL | Option already exists |
| MPW-2120 | FATAL | Option already exists for this date |
| MPW-2219 | FATAL | Both parameters are filled out when only one was expected |
| MPW-2222 | FATAL | locked pbc |
| MPW-2223 | FATAL | start date before end date |
| MPW-2285 | FATAL | No downloadable summary reports |
| MPW-2286 | FATAL | No downloadable codes |
| MPW-2296 | FATAL | Dup value VAT Code |
| MPW-2300 | FATAL | Start date is after end date |
| MPW-2301 | FATAL | Convention already exists |
| MPW-2302 | FATAL | Not all fields were filled |
| MPW-2303 | FATAL | Incorrect dateformat |
| MPW-2304 | FATAL | A string was entered where a number is required |
| MPW-2305 | FATAL | The pricetable is empty |
| MPW-2306 | FATAL | Erp Code already exists |
| MPW-2307 | FATAL | Annex already exists |
| MPW-2308 | FATAL | No initial pricetable stored yet to copy |
| MPW-2309 | FATAL | invalid BTW Rate |
| MPW-2310 | FATAL | No clients added to the convention |
| MPW-2311 | FATAL | Copyset table not saved yet |
| MPW-2312 | FATAL | This client was already added |
| MPW-2313 | FATAL | At least one criteria must be given |
| MPW-2314 | FATAL | Weight ranges must differ with exactly one unit |
| MPW-2315 | FATAL | Error while using ARS Webservice |
| MPW-2316 | FATAL | No contracting client added to the convention |
| MPW-2317 | FATAL | The date in <p1> is before today |
| MPW-2318 | FATAL | At least one pricetable must be entered or the annex must be linked to another annex |
| MPW-2319 | FATAL | Weight ranges are max 8 digit-long and have no comma in them |
| MPW-2320 | FATAL | if payment method is domicilation post, a domiciliation number must be entered |
| MPW-2321 | FATAL | only one decimal point is allowed in number <p1> |
| MPW-2322 | FATAL | the ars data of this contract was not found on ars |
| MPW-2323 | FATAL | if you use domiciliation post as payment method, each invoice clients must have a domiciliation number |
| MPW-2324 | FATAL | The value in <p1> must be a positive number |
| MPW-2325 | FATAL | Both Just-In-Time & Day Plus cannot be specified |
| MPW-2326 | FATAL | The value in <p1> must be a positive number with <p2> decimals |
| MPW-2327 | FATAL | The value in <p1> must be a number greater or equal to -1 |
| MPW-2328 | FATAL | An overlap is found in the weightranges |
| MPW-2329 | FATAL | The minimum weight must be lower than the maximum weight |
| MPW-2330 | FATAL | At least one weightrange is required |
| MPW-2331 | FATAL | Maximum weight cannot be zero |
| MPW-2332 | FATAL | Convention Nr must be a number |
| MPW-2340 | FATAL | Value is too large. |
| MPW-2350 | FATAL | The date cannot be before <p1> |
| MPW-2360 | FATAL | The date should be in the future |
| MPW-2361 | FATAL | The date should be after the begin date of the convention |
| MPW-2399 | FATAL | At least one product needs to be added to the annex |
| MPW-2526 | FATAL | Date already exists in othert pricetable |
| MPW-2527 | FATAL | Maxweight < MinWeight |
| MPW-2563 | FATAL | announced quantity cannot be zero |
| MPW-2589 | FATAL | Party must exist in prs |
| MPW-2610 | FATAL | Model not complete |
| MPW-2663 | FATAL | only integral values allowed as option quantity |
| MPW-2664 | FATAL | no blanc option quantity allowed |
| MPW-2665 | FATAL | no 0 as option quantity allowed |
| MPW-2666 | FATAL | Option quantity cannot be above the maximum number for the option |
| MPW-2667 | FATAL | The option quantity is not modifiable |
| MPW-2678 | FATAL | ARS billingcondition-paymenttype service contract does not conform delayed payment flag of part <p1> |
| MPW-2688 | FATAL | Upload succes |
| MPW-2713 | FATAL | warning schema has changed |
| MPW-2714 | FATAL | model not found |
| MPW-2715 | FATAL | metering price not needed |
| MPW-2716 | FATAL | metering price must be at least equal to price for linked convention |
| MPW-2717 | FATAL | metering machine needed |
| MPW-2718 | FATAL | metering price needed |
| MPW-2719 | FATAL | metering machine not needed |
| MPW-2720 | FATAL | user not autorised for prs_id |
| MPW-2721 | FATAL | double weight ranges detected |
| MPW-2796 | FATAL | streetname, POBOX or otheraddress must be filled in |
| MPW-2797 | FATAL | not a valid legal site |
| MPW-2800 | FATAL | Deposit center can't process this volume |
| MPW-2888 | FATAL | combination does not exist in annex |
| MPW-2896 | FATAL | account not valid |
| MPW-2897 | FATAL | account size <> 12 |
| MPW-2899 | FATAL | Customer Barcode ID already exists |
| MPW-2913 | FATAL | Name is mandatory |
| MPW-2933 | FATAL | Not a valid barcode |
| MPW-2934 | FATAL | start date and end date can differ max 1 month |
| MPW-2936 | FATAL | Vatcode, customer nr or customer name must be filled in |
| MPW-2946 | FATAL | Minstens 1 delimiter value invullen |
| MPW-2992 | FATAL | metering or product constraint |
| MPW-2993 | FATAL | no prizes specified |
| MPW-2994 | FATAL | valid date befor today |
| MPW-2995 | FATAL | VAT already exists for this date |
| MPW-2996 | FATAL | A new PRS with number <p1> is created |
| MPW-2997 | FATAL | List of parties: <p1> |
| MPW-2998 | FATAL | Referred PRS <p1> is not legal site! |
| MPW-2999 | FATAL | invalid Belgian postcode |
| MPW-3000 | FATAL | generic errors message for Double formats |
| MPW-3001 | FATAL | this client was already added as a registred depositor |
| MPW-3002 | FATAL | No products found for this product group |
| MPW-3013 | FATAL | credit nota created ! |
| MPW-3501 | FATAL | overlapping ranges |
| MPW-3502 | FATAL | active discount |
| MPW-3503 | FATAL | illegal session state |
| MPW-3504 | FATAL | illegal request |
| MPW-3505 | FATAL | existing validity |
| MPW-3506 | FATAL | existing price |
| MPW-3507 | FATAL | incorrect decimal format |
| MPW-3508 | FATAL | incorrect range |
| MPW-3509 | FATAL | Product group mismatch |
| MPW-3510 | FATAL | Not a valid percentage. |
| MPW-3511 | FATAL | empty annex name |
| MPW-3512 | FATAL | Discount already exists |
| MPW-3520 | FATAL | Message shown when 'new composition' is invoked for a date that already exists. |
| MPW-3600 | FATAL | Invalid weightbandheader |
| MPW-3601 | FATAL | Invalid columnheader |
| MPW-3602 | FATAL | Invalid weightbandvalue |
| MPW-3603 | FATAL | Invalid column name |
| MPW-3604 | FATAL | Invalid price value |
| MPW-3605 | FATAL | No file uploaded |
| MPW-3606 | FATAL | Invalid account id provided |
| MPW-3650 | FATAL | Unexpected error during pricetable upload |
| MPW-5000 | FATAL | No product was found for the requested unit weight. |
| MPW-5001 | FATAL | No product was found for the requested option. |
| MPW-5002 | FATAL | A mandatory option was not specified by the customer. |
| MPW-5003 | FATAL | The customer wants to update a deposit with a depositRef / tmpDepositNr that does not exist. |
| MPW-5004 | FATAL | The customer wants to update a deposit with a different model name. The model cannot be updated. |
| MPW-5005 | FATAL | We received a request message that could not be read or parsed. |
| MPW-5006 | FATAL | Request file not found. |
| MPW-5007 | FATAL | A file with the same filename already exists. |
| MPW-5008 | FATAL | Received a request message for a file that does not have status OK (100). |
| MPW-5009 | FATAL | The file name is not compliant with the file naming conventions. |
| MPW-5011 | FATAL | The version in the file name does not match the version in the file context. |
| MPW-5012 | FATAL | The customer id in the file name does not match the customer id in the file header. |
| MPW-5013 | FATAL | The customer reference in the file name does not match the customer reference in the file header. |
| MPW-5014 | FATAL | Unable to create/update a slave deposit for a master mailing list that does not exist. |
| MPW-5015 | FATAL | The customer id in the file name does not match the sender in the file header. |
| MPW-5016 | FATAL | Unable to create a deposit. The user does not have authorisation to create a deposit. |
| MPW-5017 | FATAL | Not allowed to link new mailing lists to a deposit that is already validated. |
| MPW-5018 | FATAL | Not allowed to link new mailing list to a deposit that does not exist. |
| MPW-5019 | FATAL | Incorrect mailinglist reference, no match found. |
| MPW-5020 | FATAL | Action not allowed, mailing list already attached. |
| MPW-5021 | FATAL | Action not allowed, mailing list is linked to a deposit that is already validated. |
| MPW-5022 | FATAL | Not allowed to delete this mailing list, because it is linked to a validated deposit. |
| MPW-5023 | FATAL | Action not allowed because of Slave-Master relationship constraint. |
| MPW-5024 | FATAL | Could not create the mailing list, because the given mailing reference already exists for this customer. |
| MPW-5025 | FATAL | Could not create the mailing list, because the given invoice client (bill-to) is not allowed for the user. |
| MPW-5026 | FATAL | Could not create the mailing list, because the used model was created by a user (modelPoralUserName) who belongs to a different customer than the user that is creating the deposit. |
| MPW-5027 | FATAL | Could not update the mailing list, because the given invoice client (bill-to) is not allowed for the user. |
| MPW-5028 | FATAL | Unable to update a deposit. The user does not have authorisation to update a deposit. |
| MPW-5029 | FATAL | Unable to validate a deposit. The user does not have authorisation to validate a deposit. |
| MPW-5030 | FATAL | Unable to delete a deposit. The user does not have authorisation to delete a deposit. |
| MPW-5031 | FATAL | Could not create the deposit, because the given deposit reference already exists for this customer. |
| MPW-5032 | FATAL | Could not create the mailing list, because the given model user does not exist. |
| MPW-5033 | FATAL | Could not validate the deposit, because the given deposit doesn't exists. |
| MPW-5034 | FATAL | Could not validate the deposit, because there were not enough addresses attached. |
| MPW-5035 | FATAL | Model is incomplete; missing product |
| MPW-5036 | FATAL | Model is incomplete; missing deposit place |
| MPW-5037 | FATAL | Model is incomplete; missing nature type |
| MPW-5038 | FATAL | Model is incomplete; missing destination type |
| MPW-5039 | FATAL | Portal could not authenticate the given user id and account id |
| MPW-5040 | FATAL | Model is incomplete; missing normalisation |
| MPW-5041 | FATAL | Model is incomplete; missing mechanisation |
| MPW-5042 | FATAL | Model is incomplete; missing sorting type |
| MPW-5043 | FATAL | Model is incomplete; missing day plus |
| MPW-5044 | FATAL | Model is incomplete; missing deposit until |
| MPW-5045 | FATAL | Model is incomplete; missing metering type |
| MPW-5047 | FATAL | Unable to create a mailing list. The user does not have authorisation to create a mailing list. |
| MPW-5048 | FATAL | Unable to check a mailing list. The user does not have authorisation to check a mailing list. |
| MPW-5049 | FATAL | Unable to delete a mailing list. The user does not have authorisation to delete a mailing list. |
| MPW-5050 | FATAL | Unable to delete the deposit. The deposit was already validated. |
| MPW-5051 | FATAL | Unable to delete the master mailing list. Unable to delete the slave deposits. |
| MPW-5052 | FATAL | Could not check the mailing list, because the given mailing reference already exists for this customer. |
| MPW-5053 | FATAL | Could not delete the deposit, because the given deposit doesn't exists. |
| MPW-5054 | FATAL | Metering price is missing but required |
| MPW-5055 | FATAL | Metering price is given but not allowed |
| MPW-5056 | FATAL | Unable to update the deposit. The deposit was already validated. |
| MPW-5057 | FATAL | Unable to validate the deposit. The deposit was already validated. |
| MPW-5058 | FATAL | Unable to validate the deposit. A mailing list was already purged |
| MPW-5059 | FATAL | Could not update the deposit, because the given deposit reference already exists for this customer. |
| MPW-5060 | FATAL | Annex type is required since current annex has multiple annex types |
| MPW-5061 | FATAL | Annex type is not allowed since current annex has only one annex type. |
| MPW-5062 | FATAL | The given depositor is not valid for this annex. |
| MPW-5063 | FATAL | Unable to validate the deposit. A mailing list was not yet fully processed. |
| MPW-5064 | FATAL | Unable to create the deposit. The master mailing list does not contain enough addresses. |
| MPW-5065 | FATAL | Unable to update the deposit. A master deposit cannot be updated to be a slave deposit. |
| MPW-5066 | FATAL | Unable to update the deposit. A slave deposit cannot be updated to be a master deposit. |
| MPW-5067 | FATAL | Unable to update the deposit. The master mailing list does not contain enough addresses. |
| MPW-5068 | FATAL | Could not check the mailing list, no certification information was found for this customer. |
| MPW-5069 | FATAL | Could not create the mailing list, no barcode or certification information was found for this customer. |
| MPW-5070 | FATAL | Unable to process request in production mode. The customer is not certified. |
| MPW-5071 | FATAL | Unable to update deposit. The deposit was created in a different mode. |
| MPW-5072 | FATAL | Unable to create mailing list in production mode. The customer is not certified. |
| MPW-5073 | FATAL | Unable to create slave mailing list. The deposit was created in a different mode. |
| MPW-5074 | FATAL | Unable to check mailing list in production mode. The customer is not certified. |
| MPW-5075 | FATAL | Unable to attach mailing list. The mailing list was created in a different mode. |
| MPW-5076 | FATAL | Unable to delete mailing list. The mailing list was created in a different mode. |
| MPW-5077 | FATAL | Unable to create mailing list. Customer does not have an MID customer id. |
| MPW-5078 | FATAL | Unable process request file. Syntax error. |
| MPW-5079 | FATAL | Unable to validate deposit. The deposit was created in a different mode. |
| MPW-5080 | FATAL | Unable to delete deposit. The deposit was created in a different mode. |
| MPW-5081 | FATAL | Unable to process request file. Could not decompress request file. |
| MPW-5082 | FATAL | Unable to create/update the slave deposit. Mailing list was created in a different mode. |
| MPW-5083 | FATAL | Unable to update execution mode of the master deposit. Deposit is still linked to slave mailing lists. |
| MPW-5084 | FATAL | Unable to update the master deposit so that it becomes a slave deposit. Deposit is still linked to slave mailing lists. |
| MPW-5085 | FATAL | Unable to update the master deposit so that it no longer is a MID deposit. Deposit is still linked to slave mailing lists. |
| MPW-5086 | WARN | Invalid contact email address. |
| MPW-5087 | FATAL | The account id does not match the account id in the file header. |
| MPW-5088 | FATAL | Unable to upload file. Max file size exceeded. |
| MPW-5089 | FATAL | File has allready been deleted |
| MPW-5090 | FATAL | File cannot be opened |
| MPW-5091 | FATAL | Please enter a filename in the field |
| MPW-5092 | FATAL | Unable to upload file. Could not determine portal user. |
| MPW-5093 | FATAL | Unable to upload file. File not Found |
| MPW-5094 | FATAL | Maximum number of items exceeded for a Mail ID deposit in Certification mode |
| MPW-5095 | FATAL | Not allowed to link new mailing list to a deposit that belongs to another PBC. |
| MPW-5097 | FATAL | The delivery date is not compliant with the distribution period in model |
| MPW-5100 | FATAL | It's not allowed to use different expected deposit places for this deposit group |
| MPW-5102 | FATAL | There is no right to create a deposit group for this convention |
| MPW-5103 | FATAL | There is no right to create a deposit group for different places within this convention |
| MPW-5104 | FATAL | The deposit has at least one characteristic in the model that differs from the first deposit of the deposit group |
| MPW-5105 | FATAL | The customer wants to update/delete/validate a deposit group with a depositGroupRef / tmpDepositGroupNr that does not exist. |
| MPW-5106 | FATAL | Unable to update/delete/validate the deposit group. The deposit group was already validated. |
| MPW-5108 | FATAL | Unable to update/delete/validate the deposit group. The deposit group was created in a different mode. |
| MPW-5109 | FATAL | A deposit belonging to a deposit group cannot be updated/deleted/validated |
| MPW-5110 | FATAL | Unable to update/delete/validate a deposit group belonging to another account |
| MPW-5111 | FATAL | As a router, it's impossible to update a deposit group belonging to another administrator |
| MPW-5112 | FATAL | Unable to update/delete/validate a deposit belonging to another account |
| MPW-5113 | FATAL | As a router, it's impossible to update/delete/validate a deposit belonging to another administrator |
| MPW-5114 | FATAL | A deposit not associated with a file cannot be linked to a mailing list. |
| MPW-5115 | FATAL | A Mail-ID deposit should be associated with a Mail-ID file |
| MPW-5116 | FATAL | Model is incomplete; missing fileType |
| MPW-5117 | WARN | File type "Data Quality" was chosen initially, but isn't applicable for the current annex. The file type is reset to "No File" |
| MPW-5118 | FATAL | Could not create the parent holding because it already exist |
| MPW-5128 | FATAL | Not allowed to delete this mailing list, because it is linked to a booking drop. |
| MPW-5129 | FATAL | An Intelligent Bundling deposit should be associated with a mailing list that has Intelligent Bundling format. |
| MPW-5130 | FATAL | A split drop is only possible for a minimum of <p1> items. |
| MPW-5131 | FATAL | The total Volume over the days ( <p1> ) is different from the announced volume ( <p2> ). |
| MPW-5132 | FATAL | The total volume of the split drops is different from the announced volume. |
| MPW-5133 | FATAL | A split drop deposit must be done over consecutive working days |
| MPW-5134 | FATAL | No split drop possible for the selected Mechanisation. |
| MPW-5135 | FATAL | Volume per day should at least be <p1> |
| MPW-5136 | FATAL | The volume for a drop day can not be empty |
| MPW-5137 | FATAL | Negative volume for a drop day is not allowed. |
| MPW-5138 | FATAL | Unable to delete a mailing plan. The user does not have authorization to delete a mailing plan. |
| MPW-5139 | FATAL | Unable to replace a mailing plan. The user does not have authorization to replace a mailing plan. |
| MPW-5140 | FATAL | Unable to create a mailing plan. The user does not have authorization to create a mailing plan. |
| MPW-5141 | FATAL | Could not create the mailing plan, because the given mailing reference already exists for this customer. |
| MPW-5142 | FATAL | Not allowed to delete a mailing plan because the mailing plan reference does not exists. |
| MPW-5143 | INFO | It will be required to pass at the counter where the specimen check will happen |
| MPW-5999 | FATAL | Unable to resolve the cause of the exception. Unexpected error. |
| MPW-6000 | WARN | Invalid erp-code |
| MPW-6001 | FATAL | Name is already used |
| MPW-6002 | FATAL | count to large |
| MPW-6003 | FATAL | Cannot insert null value |
| MPW-7000 | FATAL | Missing value in search criteria for Quality Observation Search: Deposit Nr |
| MPW-7001 | FATAL | Missing value in search criteria for Quality Observation Search: Customer Nr |
| MPW-7002 | FATAL | Missing value in search criteria for Quality Observation Search: PB Nr |
| MPW-7003 | FATAL | Missing value in search criteria for Quality Observation Search: FRM Nr |
| MPW-7004 | FATAL | Data could not be updated/created, due to data integrity constraints |
| MPW-7005 | FATAL | No client could be found for this deposit |
| MPW-7006 | FATAL | No client could be found for this customer nr |
| MPW-7007 | FATAL | Field freetext and reason for changing must be field in |
| MPW-7010 | FATAL | Quality Criteria is mandatory |
| MPW-7011 | FATAL | Observation Location is mandatory |
| MPW-7039 | FATAL | The quality criteria description is not of format "000 Description" |
| MPW-7040 | FATAL | quality criteria not found |
| MPW-7041 | FATAL | duplicate quality criteria |
| MPW-7042 | FATAL | franking machine number already bound to an other customer |
| MPW-7043 | FATAL | postage paid number already bound to an other customer |
| MPW-7044 | FATAL | Wrong value for remark and/or quantity |
| MPW-7045 | FATAL | Location must be checked |
| MPW-7046 | FATAL | City must be selected |
| MPW-7047 | FATAL | No city are corresponding to this city and zipcode |
| MPW-7048 | FATAL | Null value not allowed |
| MPW-7049 | FATAL | Weight Range is not valid |
| MPW-7050 | FATAL | First row must begin with 0 |
| MPW-7051 | FATAL | PRC Threshold range is not valid |
| MPW-7052 | FATAL | No valid contracts found for the current bill-to |
| MPW-7053 | FATAL | Unable to create slave mailing list. Referring to a parcel deposit isn't allowed |
| MPW-7054 | FATAL | Unable to create slave mailing list. Referring to a deposit associated with an annex having multiple products isn't allowed |
| MPW-7055 | FATAL | Unable to create slave mailing list. Referring to a deposit having a pricing type different than unit weight pricing isn't allowed |
| MPW-7056 | FATAL | An identical deposit can contain only one composition |
| MPW-7057 | FATAL | All compositions of an identical deposit should contain the same unit weight |
| MPW-7058 | FATAL | Each product should have at most one composition |
| MPW-7059 | FATAL | All unit weights should be unique |
| MPW-7060 | FATAL | For each product, the unit weights should be unique |
| MPW-7061 | FATAL | The product group doesn't allow multi annex lines, the remaining annexes must have the same pricing type |
| MPW-7065 | ERROR | A category deposit should contain several compositions |
| MPW-8000 | ERROR | Wrong value for field |
| MPW-9000 | FATAL | Total weight must be lower than 10 000 000 000 g ( in the past it is <1> should be less than <2>) |
| MPW-9001 | ERROR | <p1> cannot be zero |
| MPW-9002 | ERROR | <p1> should be a real number |
| MPW-9003 | ERROR | <p1> must be between <p2> and <p3> |
| MPW-9004 | ERROR | No account found for the given id |
| MPW-9005 | ERROR | <p1> is mandotory |
| MPW-9006 | ERROR | Account id <p1> was not found |
| MPW-9007 | ERROR | Account id <p1> is already in this group |
| MPW-9008 | ERROR | Account id <p1> is already in the group <p2> |
| MPW-9009 | ERROR | <p1> is not a number |
| MPW-9010 | ERROR | At least one field should be filled in |
| MPW-9011 | ERROR | Description must be filled in |
| MPW-9012 | ERROR | Unable to find the given invoice grouping |
| MPW-9013 | ERROR | <p1> already exists |
| MPW-9014 | ERROR | Unable to create deposit with this bill to and this periodical agreement |
| MPW-9015 | ERROR | Unable to process a deposit with a cancelled agreement |
| MPW-9016 | ERROR | A penalty is already applied on this deposit |
| MPW-9017 | ERROR | The deposit has no periodical or the periodical is cancelled |
| MPW-9020 | ERROR | Pricetable already exists |
| MPW-9021 | ERROR | Annex already linked to other pricetable |
| MPW-9026 | INFO | Upload Successful |
| MPW-9027 | ERROR | Incorrect filetype |
| MPW-9028 | ERROR | Incorrect file: Number of columns is incorrect for line <p1> |
| MPW-9029 | ERROR | The address file cannot contain blank rows |
| MPW-9030 | ERROR | At least 1 address should be specified |
| MPW-9031 | WARNING | <p1> avcs cards have been printed |
| MPW-9032 | ERROR | card <p1> with barcode <p2> cannot be printed |
| MPW-9033 | WARNING | Cannot print avcs card because deposit does not exist or is blocked |
| MPW-9034 | ERROR | Cell <p1> at row <p2> contains a non string or numeric value |
| MPW-9035 | ERROR | Invalid destination center number provided |
| MPW-9036 | ERROR | The field <p1> must contain <p2> characters. |
| MPW-9037 | ERROR | Unable to delete the field: No rights for this file. |
| MPW-9038 | INFO | Delete successful |
| MPW-9039 | ERROR | The mailing reference is already used |
| MPW-9040 | ERROR | The field <p1> can not be larger than <p2> characters |
| MPW-9041 | ERROR | Response generation successful |
| MPW-9042 | ERROR | The presorting type does not match the presorting type of the annex it is linked to. |
| MPW-9043 | ERROR | The field <p1> should be a valid number |
| MPW-9044 | ERROR | Invalid column header: Expected <p1>, but was <p2> |
| MPW-9045 | ERROR | The field <p1> is a required field, but was not filled in at row <p2> |
| MPW-9046 | ERROR | The field <p1> should be a number, but was not at row <p2> |
| MPW-9047 | ERROR | The value for <p1> at row <p2> is larger than <p3> characters |
| MPW-9048 | ERROR | A pipe is not allowed in a cell (Row <p1>, Cell <p2>) |
| MPW-9049 | ERROR | The address on row <p1> should contain more than the seq and priority |
| MPW-9051 | ERROR | The total amount fee must be equal to total quantity subscription fee |
| MPW-9053 | ERROR | The field <p1> at row <p2> should contain one of the following values: <p3> |
| MPW-9054 | ERROR | The field <p1> at row <p2> should be between <p3> and <p4> characters |
| MPW-9055 | ERROR | The field <p1> at row <p2> is a response field, and should be empty |
| MPW-9056 | WARNING | No subscription validity was found for <p1>. Please make sure to add it later. |
| MPW-9057 | ERROR | Subscription validity date is incorrect. |
| MPW-9058 | WARNING | There was at least 1 valid annex that didn't contain a pricegrid for <p1> |
| MPW-9059 | WARNING | No annexes found for this convention. Do not forget to make one for <p1> |
| MPW-9060 | ERROR | Can not upload an empty excel file |
| MPW-9061 | ERROR | The sequence should be unique, but <p1> was used more than once in this file |
| MPW-9062 | ERROR | Can not have this Sorting type for this File type |
| MPW-9063 | ERROR | Can not have this File type for this Mechanisation |
| MPW-9064 | ERROR | You need to upload a file |
| MPW-9065 | ERROR | Validity date cannot be before Convention start date |
| MPW-9066 | ERROR | The expected deposit date must not be before <p1>. |
| MPW-9067 | ERROR | If the unit weight is larger then <p1> then every sub drop can only have a maximum of <p2> items |
| MPW-9068 | ERROR | A dimension (HxWxD) must contain at least both height and width |
| MPW-9069 | ERROR | No duplicate <p1> allowed |
| MPW-9070 | ERROR | <p1> should be <p2> or more. |
| MPW-9071 | ERROR | The <p1> mailing list is selected more than once. |
| MPW-9072 | ERROR | The selected mailing lists for drop day x do not contain the required number of addresses |
| MPW-9073 | ERROR | The selected mailing lists for drop day <p1> contain too many addresses |
| MPW-9074 | ERROR | You can not add more then <p1> consecutive days. |
| MPW-9075 | ERROR | A drop cannot have more than 1 composition if the booking format is Identical |
| MPW-9076 | ERROR | You can only get an Authorisation report for a booking that is announced and validated |
| MPW-9077 | ERROR | You cannot choose a sender without a fee. |
| MPW-9078 | ERROR | Split drop is not allowed for less than <1> |
| MPW-9079 | ERROR | The sender is mandatory. |
| MPW-9080 | WARNING | Message shown when 'new composition' is invoked for a date & level that already exists. |
| MPW-9081 | WARNING | Level number |
| MPW-9082 | ERROR | <p1> is not a correct level. Should be a number. |
| MPW-9083 | ERROR | Level <p1> is missing for column <p2> |
| MPW-9084 | ERROR | Level(s) <p1> are not configured in the application. Level(s) <p2> are missing in the uploaded file. Affects price table <p3> |
| MPW-9085 | ERROR | No levels defined for price table <p1> |
| MPW-9086 | ERROR | The price table <p1> must be unique for non intermediary subscription. |
| MPW-9087 | ERROR | Annex doesn't have all prices level |
| MPW-9088 | ERROR | Cannot change a normal contract to an Intermediary Subscription contract |
| MPW-9089 | ERROR | Level <p1> is defined multiple times for column <p2>. |
| MPW-9090 | ERROR | Minimum volume for per drop is <p1>. |
| MPW-9091 | ERROR | A requalified version of a deposit can only be canceled. |
| MPW-9092 | ERROR | Contact info is missing a mandatory field |
| MPW-9093 | ERROR | Multiple IS conventions (<p1>) found for invoice client <p2> |
| MPW-9094 | ERROR | No booking found |
| MPW-9095 | ERROR | The deposit is linked to a booking <p1> |
| MPW-9096 | ERROR | E-return validity date is incorrect. |
| MPW-9097 | ERROR | The total amount fee must be equal to total quantity e-return fee |
| MPW-9098 | ERROR | Convention with e-Return fee can only have a price model Progressive or Instant. |
| MPW-9099 | ERROR | A subscription fee should be first created. |
| MPW-9100 | ERROR | E-Return validity date should not be before subscription validity date. |
| MPW-9101 | ERROR | A deposit DM Connect without file will lack discounts. |
| MPW-9102 | ERROR | A deposit Admin without file will lack discounts. |
| MPW-9103 | ERROR | The use of Data Quality file is not allowed for this deposit with product Admin. |
| MPW-9104 | ERROR | Midnumber is missing but is mandatory |
| MPW-9105 | ERROR | A yearly plan already exists for this year. |
| MPW-9106 | ERROR | The volume deposit and the drop range volume totals are different. |
| MPW-9107 | ERROR | The comments must be provided in order to change the status. |
| MPW-9108 | ERROR | The ARR ( <p1> ) is too low to be able to validate the deposit. |
| MPW-9109 | ERROR | It is too late to define the deposit as early drop for today. |
| MPW_9110 | WARNING | "R&S multiple/R&S unique" will be replaced by "R&S multiple with MID/R&S unique with MID" |
| MPW-9111 | ERROR | Deposit with temp deposit number <p1> has no pallet box data |
| MPW-9112 | ERROR | Mailinglist <p1> has no pallet box data |
| MPW-9113 | ERROR | EVD lost due to mailing address deviation is more than expected |
| MPW-9114 | ERROR | EVD lost due to deposit not validated on time |
| MPW-9115 | ERROR | Distribution moment not selected |
| MPW-9116 | ERROR | Week Certain Distribution Moment should not be mixed with BOW and EOW |
| MPW-9221 | ERROR | MPW-9221: Convention is not available for the selected drop date. |
| MPW-9800 | ERROR | New booking rules : The booking discount question must be answered. |
| MPW-9801 | ERROR | New booking rules : The deposit cannot be postponed more than <1> days comparing to the last booked date. |
| MPW-9802 | ERROR | New booking rules : The maximum days a deposit can be postponed comparing to its last booked date must be configured. |
| MPW-9803 | ERROR | New booking rules : The booking discount option must be answered. |
| MPW-9901 | ERROR | Specimen Validation : Email notification can not be empty. |
| MPW-9902 | ERROR | Specimen Validation : Title can not be empty. |
| MPW-9903 | ERROR | Specimen Validation : File name can not be empty. |
| MPW-9904 | ERROR | Specimen Validation : File can not be empty. |
| MPW-9905 | ERROR | Specimen Validation : File type is not supported (pdf only). |
| MPW-9906 | ERROR | Specimen Validation : File size is exceeded. |
| MPW-9911 | ERROR | Specimen Validation : Start date is incorrect. |
| MPW-9912 | ERROR | Specimen Validation : End date is incorrect. |
| MPW-9913 | ERROR | Specimen Validation : End date cannot be before the start date. |
| MPW-9914 | ERROR | Specimen Validation : The id is incorrect. |
| MPW-9915 | ERROR | Your file size is too big. |
| MPW-9920 | INFO | Specimen Validation : The specimen validation does not exist. |
| MPW-9921 | INFO | Specimen Validation : No specimen validation attached. |
| MPW-9922 | INFO | Specimen Validation : The specimen validation request has been deactivated |
| MPW-9990 | ERROR | Specimen Validation : Unknown portal user. |
